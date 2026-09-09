import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Books Phase 4 invoicing -- Phase 1 (full workflow, chat-only messaging),
// against the REAL backend. Supersedes tests/payments/invoicing-phase1.spec.ts
// (deleted), whose standalone-invoice-creation scenario no longer exists:
// invoices now always belong to an estimate's payment schedule.
//
// This spec, like its predecessor, does not complete a real on-chain USDC
// payment (finalize_invoice_payment is REVOKEd from authenticated/anon --
// only the service-role edge function may call it, after a confirmed
// payment). It proves everything up to that boundary: job -> estimate ->
// send (chat + invite) -> customer joins -> approves (in the actual
// PublicEstimateApprovalPage UI) -> deposit invoice auto-created and sent
// -> public pay page shows it correctly, unsigned -> job progress
// milestones auto-send the remaining schedule invoice. It prints every
// chat message and job_event it observes along the way, and every invoice
// status change, as the brief asks.
//
// Requires a second pre-provisioned test account (the customer) in
// addition to A -- claim_customer_invite checks that the authenticated
// caller's own email matches customers.email, so this can't be a
// throwaway signUp() without knowing whether email confirmation is
// required for this project. Skips itself without credentials.

const SUPABASE_URL = 'https://zuwkgasbkpjlxzsjzumu.supabase.co';
const SUPABASE_PROJECT_REF = 'zuwkgasbkpjlxzsjzumu';
const ANON_KEY = 'sb_publishable_Z8-I1gu2Q1yid1Q4jKRf7Q_jSGcsVpa';

const GOSAT_EMAIL = process.env.TEST_GOSAT_EMAIL;
const GOSAT_PASSWORD = process.env.TEST_GOSAT_PASSWORD;
const A_EMAIL = process.env.TEST_A_EMAIL;
const A_PASSWORD = process.env.TEST_A_PASSWORD;
const A_USER_ID = process.env.TEST_A_USER_ID;
const CUSTOMER_EMAIL = process.env.TEST_CUSTOMER_EMAIL;
const CUSTOMER_PASSWORD = process.env.TEST_CUSTOMER_PASSWORD;

const HAVE_CREDS = Boolean(
  GOSAT_EMAIL && GOSAT_PASSWORD && A_EMAIL && A_PASSWORD && A_USER_ID && CUSTOMER_EMAIL && CUSTOMER_PASSWORD
);

async function signIn(email: string, password: string) {
  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  expect(error, `sign-in as ${email} must succeed`).toBeNull();
  return { client, session: data.session! };
}

async function useSession(page: import('@playwright/test').Page, session: unknown) {
  await page.addInitScript(
    ({ storageKey, session }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(session));
      window.sessionStorage.setItem('audioUnlocked', '1');
    },
    { storageKey: `sb-${SUPABASE_PROJECT_REF}-auth-token`, session },
  );
}

test.describe('job invoicing Phase 1 (full workflow)', () => {
  test.skip(!HAVE_CREDS, 'Set TEST_GOSAT_EMAIL/PASSWORD, TEST_A_EMAIL/PASSWORD/USER_ID and TEST_CUSTOMER_EMAIL/PASSWORD to run this spec.');

  test('note -> estimate -> chat invite -> approve -> deposit invoice -> milestone progression', async ({ page, context }) => {
    const { client: gosatClient } = await signIn(GOSAT_EMAIL!, GOSAT_PASSWORD!);
    await gosatClient.from('feature_subscriptions').upsert(
      { user_id: A_USER_ID, feature: 'invoicing', status: 'trial', current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(), source: 'gosat' },
      { onConflict: 'user_id,feature' }
    );

    const { client: aClient, session: aSession } = await signIn(A_EMAIL!, A_PASSWORD!);
    await useSession(page, aSession);

    let { data: company } = await aClient.from('companies').select('id').eq('owner_user_id', A_USER_ID).eq('books_enabled', true).limit(1).maybeSingle();
    if (!company) {
      const created = await aClient.from('companies').insert({ name: 'Playwright test co', slug: `playwright-test-co-${Date.now()}`, owner_user_id: A_USER_ID, books_enabled: true, currency: 'USD' }).select('id').single();
      company = created.data;
    }
    expect(company?.id, 'A needs a books-enabled business').toBeTruthy();

    // 1. Job note (create_job_note also provisions the chat room).
    const { data: job, error: jobErr } = await aClient.rpc('create_job_note', {
      _business_id: company!.id, _title: `Playwright deck job ${Date.now()}`, _description: 'Rebuild the back deck',
      _date_needed: null, _location: 'Test St', _notes_to_supplier: null,
    });
    expect(jobErr, 'create_job_note must succeed').toBeNull();
    console.log('[job] created', job.id, 'chat room', job.chat_channel_id);

    // 2. Supplier quote (reference cost, not customer-visible in the UI).
    await aClient.from('supplier_quotes').insert({ job_notes_id: job.id, supplier_name: 'Playwright Timber Co', amount: 300, notes: 'decking boards' });

    // 3. Customer, not yet a member (forces the invite path).
    const { data: customer, error: custErr } = await aClient
      .from('customers')
      .insert({ business_id: company!.id, name: 'Playwright Customer', email: CUSTOMER_EMAIL })
      .select('id')
      .single();
    expect(custErr, 'customer insert must succeed').toBeNull();

    // 4. Estimate: one line, two schedule items (40% deposit, 60% on completion).
    const { data: estNumber } = await aClient.rpc('next_estimate_number', { _business_id: company!.id });
    const { data: estimate, error: estErr } = await aClient
      .from('estimates')
      .insert({ business_id: company!.id, job_notes_id: job.id, customer_id: customer!.id, number: estNumber, subtotal: 1000, total: 1000 })
      .select('id, public_token')
      .single();
    expect(estErr, 'estimate insert must succeed').toBeNull();
    await aClient.from('line_items').insert({ estimate_id: estimate!.id, position: 0, description: 'Deck rebuild — labour and materials', quantity: 1, unit_price: 1000 });
    const { data: schedule } = await aClient.from('payment_schedule_items').insert([
      { estimate_id: estimate!.id, position: 0, label: 'Deposit', percentage_of_total: 40, amount: 400, trigger_type: 'date', due_offset_days: 0 },
      { estimate_id: estimate!.id, position: 1, label: 'Final balance', percentage_of_total: 60, amount: 600, trigger_type: 'job_status', trigger_job_status: 'job_completion' },
    ]).select('id, label');
    console.log('[estimate] payment schedule', schedule);

    // 5. Send it -- posts the invite link in chat (customer has no member_user_id yet).
    const { error: sendErr } = await aClient.rpc('send_estimate', { _estimate_id: estimate!.id });
    expect(sendErr, 'send_estimate must succeed').toBeNull();

    const { data: chatAfterSend } = await aClient.from('chat_messages').select('content, message_type, created_at').eq('room_id', job.chat_channel_id).order('created_at');
    console.log('[chat after send]', chatAfterSend);
    const inviteMsg = chatAfterSend!.find((m: any) => m.message_type === 'invite_link');
    expect(inviteMsg, 'an invite link message should be posted').toBeTruthy();

    const { data: custRow } = await aClient.from('customers').select('invite_token').eq('id', customer!.id).single();
    expect(custRow?.invite_token, 'an invite token should have been generated on send').toBeTruthy();

    // 6. Customer joins: sign in as the pre-provisioned customer test
    //    account (its email must equal CUSTOMER_EMAIL for claim_customer_invite's
    //    match check) and claim the invite -- exercising the same RPC JoinPage calls.
    const { client: custClient, session: custSession } = await signIn(CUSTOMER_EMAIL!, CUSTOMER_PASSWORD!);
    const { data: claimResult, error: claimErr } = await custClient.rpc('claim_customer_invite', { _token: custRow!.invite_token });
    expect(claimErr, 'claim_customer_invite must succeed').toBeNull();
    expect(claimResult.ok, `claim should report ok, got ${JSON.stringify(claimResult)}`).toBe(true);
    console.log('[join] claim result', claimResult);

    const { data: chatAfterJoin } = await aClient.from('chat_messages').select('content, message_type').eq('room_id', job.chat_channel_id).order('created_at');
    console.log('[chat after join]', chatAfterJoin);

    // 7. Customer approves the estimate through the ACTUAL public page.
    const custPage = await context.newPage();
    await useSession(custPage, custSession);
    await custPage.goto(`/estimate/${estimate!.public_token}`);
    await expect(custPage.getByText('$1000.00', { exact: false }).or(custPage.getByText('$1,000.00', { exact: false })).first()).toBeVisible();
    await custPage.getByRole('button', { name: /^approve$/i }).click();
    await expect(custPage.getByText(/approved/i).first()).toBeVisible();

    const { data: estAfterApproval } = await aClient.from('estimates').select('status').eq('id', estimate!.id).single();
    expect(estAfterApproval?.status).toBe('approved');

    // 8. Deposit invoice: auto-created + auto-sent by approve_estimate ->
    //    generate_estimate_invoices. Verify state and the public pay page, unsigned.
    const { data: invoices } = await aClient.from('invoices').select('id, kind, status, total, public_token').eq('estimate_id', estimate!.id).order('created_at');
    console.log('[invoices after approval]', invoices);
    expect(invoices!.length, 'one invoice per schedule item').toBe(2);
    const deposit = invoices!.find((i: any) => i.kind === 'deposit')!;
    const balance = invoices!.find((i: any) => i.kind !== 'deposit')!;
    expect(deposit.status).toBe('sent');
    expect(deposit.total).toBe(400);
    expect(balance.status).toBe('draft');
    expect(balance.total).toBe(600);

    const guest = await context.newPage();
    await guest.goto(`/pay/${deposit.public_token}`);
    await expect(guest.getByText('Deposit', { exact: false }).first()).toBeVisible();
    await expect(guest.getByText('$400.00', { exact: false }).first()).toBeVisible();
    await expect(guest.getByRole('button', { name: /pay with usdc/i })).toBeVisible();

    // 9. Job progress milestones -- 50% (no schedule item triggers on it in
    //    this estimate, so this only proves the state transition + chat
    //    message), then completion, which sends the balance invoice.
    const { error: mark50Err } = await aClient.rpc('mark_job_progress', { _job_notes_id: job.id, _milestone: 'job_50pct' });
    expect(mark50Err).toBeNull();
    const { error: markDoneErr } = await aClient.rpc('mark_job_progress', { _job_notes_id: job.id, _milestone: 'job_completion' });
    expect(markDoneErr).toBeNull();

    const { data: balanceAfter } = await aClient.from('invoices').select('status, sent_at').eq('id', balance.id).single();
    expect(balanceAfter?.status, 'the completion-triggered invoice should now be sent').toBe('sent');

    const { data: finalEvents } = await aClient.from('job_events').select('event_type, from_state, to_state, actor, notes, created_at').eq('job_notes_id', job.id).order('created_at');
    console.log('[job_events, full timeline]', finalEvents);
    const { data: finalChat } = await aClient.from('chat_messages').select('content, message_type, created_at').eq('room_id', job.chat_channel_id).order('created_at');
    console.log('[chat, full transcript]', finalChat);

    // Full payment (and therefore job auto-completion + the first-job
    // congratulations message) requires a confirmed on-chain USDC transfer,
    // which only the create-invoice-payment/sweep-solana-payments edge
    // functions and the service-role-only finalize_invoice_payment RPC can
    // drive -- out of scope for this spec, same boundary the deleted
    // Phase 1 spec stopped at.
  });
});
