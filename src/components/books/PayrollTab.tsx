import { Fragment, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FileText, Loader2, Pause, Play, Plus, Trash2, Upload, Calculator, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ComplianceBanner from './ComplianceBanner';
import { formatZAR, BOOKS_CURRENCY } from '@/lib/books/format';
import {
  computePayrollPreview,
  type PayrollEmployeeInput,
  type PayrollPreview,
  type TaxSettings,
} from '@/lib/books/payroll';
import type { ContractRow, EmployeeRow, PayrollRunRow } from '@/hooks/useBooksData';

interface Props {
  businessId: string;
  employees: EmployeeRow[];
  contractByEmployee: Map<string, ContractRow>;
  runs: PayrollRunRow[];
  taxSettings: TaxSettings;
  onChanged: () => void;
}

const firstOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const lastOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
};

export default function PayrollTab({
  businessId, employees, contractByEmployee, runs, taxSettings, onChanged,
}: Props) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [payType, setPayType] = useState<'salary' | 'hourly'>('salary');
  const [salary, setSalary] = useState('');
  const [rate, setRate] = useState('');
  const [hours, setHours] = useState('');
  const [addingEmployee, setAddingEmployee] = useState(false);

  const [settings, setSettings] = useState<TaxSettings>(taxSettings);
  const [savingSettings, setSavingSettings] = useState(false);

  const [periodStart, setPeriodStart] = useState(firstOfMonth());
  const [periodEnd, setPeriodEnd] = useState(lastOfMonth());
  const [payDate, setPayDate] = useState(lastOfMonth());
  const [preview, setPreview] = useState<PayrollPreview | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [committing, setCommitting] = useState(false);

  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const pendingEmployee = useRef<string | null>(null);

  const activeEmployees = useMemo(() => employees.filter((e) => e.active), [employees]);

  const payrollInputs = useMemo<PayrollEmployeeInput[]>(
    () =>
      activeEmployees.map((e) => ({
        id: e.id,
        name: e.name,
        role: e.role,
        pay_type: e.pay_type,
        monthly_salary: e.monthly_salary,
        hourly_rate: e.hourly_rate,
        hours_per_month: e.hours_per_month,
        contract: contractByEmployee.get(e.id)?.parsed_terms ?? null,
      })),
    [activeEmployees, contractByEmployee]
  );

  const addEmployee = async () => {
    if (!name.trim()) return toast.error('Employee name is required');
    setAddingEmployee(true);
    const { error } = await supabase.from('employees' as any).insert({
      business_id: businessId,
      name: name.trim(),
      role: role.trim() || null,
      pay_type: payType,
      monthly_salary: payType === 'salary' ? Number(salary) || 0 : null,
      hourly_rate: payType === 'hourly' ? Number(rate) || 0 : null,
      hours_per_month: payType === 'hourly' ? Number(hours) || 0 : null,
      active: true,
    } as any);
    setAddingEmployee(false);
    if (error) return toast.error(error.message);
    toast.success('Employee added');
    setName(''); setRole(''); setSalary(''); setRate(''); setHours('');
    setPreview(null);
    onChanged();
  };

  const toggleActive = async (emp: EmployeeRow) => {
    const { error } = await supabase.from('employees' as any).update({ active: !emp.active } as any).eq('id', emp.id);
    if (error) return toast.error(error.message);
    setPreview(null);
    onChanged();
  };

  const removeEmployee = async (emp: EmployeeRow) => {
    const { error } = await supabase.from('employees' as any).delete().eq('id', emp.id);
    if (error) return toast.error(error.message);
    toast.success(`${emp.name} removed`);
    setPreview(null);
    onChanged();
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    const { error } = await supabase
      .from('tax_settings' as any)
      .upsert(
        {
          business_id: businessId,
          paye_pct: Number(settings.paye_pct),
          uif_ceiling: Number(settings.uif_ceiling),
          sdl_applies: settings.sdl_applies,
        } as any,
        { onConflict: 'business_id' }
      );
    setSavingSettings(false);
    if (error) return toast.error(error.message);
    toast.success('Tax settings saved');
    setPreview(null);
    onChanged();
  };

  const pickContract = (employeeId: string) => {
    pendingEmployee.current = employeeId;
    fileRef.current?.click();
  };

  const uploadContract = async (file: File) => {
    const employeeId = pendingEmployee.current;
    if (!employeeId) return;
    setUploadingFor(employeeId);
    try {
      const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
      const path = `${businessId}/contracts/${employeeId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('books-docs').upload(path, file, {
        contentType: file.type || 'application/pdf',
        upsert: false,
      });
      if (upErr) throw upErr;

      const { error } = await supabase.functions.invoke('parse-contract', {
        body: { business_id: businessId, employee_id: employeeId, file_path: path },
      });
      if (error) throw error;

      toast.success('Contract parsed — it is now the source of truth for this employee');
      setPreview(null);
      onChanged();
    } catch (e: any) {
      toast.error(e?.message || 'Could not parse that contract');
    } finally {
      setUploadingFor(null);
      pendingEmployee.current = null;
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const runPreview = () => {
    if (payrollInputs.length === 0) return toast.error('No active employees to pay');
    setPreview(computePayrollPreview(payrollInputs, settings));
  };

  const commit = async () => {
    if (!preview) return;
    setCommitting(true);
    try {
      const { data: run, error: runErr } = await supabase
        .from('payroll_runs' as any)
        .insert({
          business_id: businessId,
          period_start: periodStart,
          period_end: periodEnd,
          pay_date: payDate,
          totals: preview.totals as any,
          employer_fica: preview.employer_contributions,
          total_cost: preview.total_cost,
        } as any)
        .select('id')
        .single();
      if (runErr) throw runErr;

      const runId = (run as any).id as string;
      const { error: lineErr } = await supabase.from('payroll_lines' as any).insert(
        preview.lines.map((l) => ({
          business_id: businessId,
          payroll_run_id: runId,
          employee_id: l.employee_id,
          employee_name: l.employee_name,
          gross: l.gross,
          paye: l.paye,
          uif_employee: l.uif_employee,
          uif_employer: l.uif_employer,
          sdl: l.sdl,
          deductions: l.deductions,
          net: l.net,
          line_items: l.line_items as any,
        })) as any
      );
      if (lineErr) throw lineErr;

      const { data: expense, error: expErr } = await supabase
        .from('expenses' as any)
        .insert({
          business_id: businessId,
          description: `Payroll ${periodStart} to ${periodEnd}`,
          amount: preview.total_cost,
          currency: BOOKS_CURRENCY,
          category: 'Payroll',
          spent_on: payDate,
          source: 'payroll_run',
        } as any)
        .select('id')
        .single();
      if (expErr) throw expErr;

      await supabase
        .from('payroll_runs' as any)
        .update({ expense_id: (expense as any).id } as any)
        .eq('id', runId);

      toast.success('Payroll approved, logged and posted to expenses');
      setPreview(null);
      setConfirmOpen(false);
      onChanged();
    } catch (e: any) {
      toast.error(e?.message || 'Payroll run failed');
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <ComplianceBanner />

      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadContract(f);
        }}
      />

      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-base">Add an employee</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label htmlFor="emp-name">Name</Label>
              <Input id="emp-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-role">Role</Label>
              <Input id="emp-role" value={role} onChange={(e) => setRole(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Pay type</Label>
              <Select value={payType} onValueChange={(v) => setPayType(v as 'salary' | 'hourly')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="salary">Salary</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {payType === 'salary' ? (
              <div className="space-y-1.5">
                <Label htmlFor="emp-salary">Monthly salary (ZAR)</Label>
                <Input id="emp-salary" inputMode="decimal" value={salary} onChange={(e) => setSalary(e.target.value)} />
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="emp-rate">Hourly rate (ZAR)</Label>
                  <Input id="emp-rate" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emp-hours">Hours / month</Label>
                  <Input id="emp-hours" inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} />
                </div>
              </>
            )}
          </div>
          <Button onClick={addEmployee} disabled={addingEmployee}>
            {addingEmployee ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Add employee
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-base">Employee roster</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {employees.length === 0 && <p className="text-sm text-muted-foreground">No employees yet.</p>}
          {employees.map((e) => {
            const contract = contractByEmployee.get(e.id);
            const terms = contract?.parsed_terms;
            return (
              <div key={e.id} className="rounded-lg border border-border/50 bg-background/40 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {e.name}
                      {e.role ? <span className="text-muted-foreground"> · {e.role}</span> : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {e.pay_type === 'salary'
                        ? `Manual rate: ${formatZAR(e.monthly_salary ?? 0)} / month`
                        : `Manual rate: ${formatZAR(e.hourly_rate ?? 0)} × ${e.hours_per_month ?? 0} h`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!e.active && <Badge variant="outline" className="uppercase">Paused</Badge>}
                    <Button size="sm" variant="outline" onClick={() => pickContract(e.id)} disabled={uploadingFor === e.id}>
                      {uploadingFor === e.id ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
                      {contract ? 'Replace contract' : 'Upload contract'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleActive(e)}>
                      {e.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => removeEmployee(e)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 text-xs">
                  {terms?.basic_salary ? (
                    <span className="inline-flex flex-wrap items-center gap-2 text-emerald-300">
                      <FileText className="h-3.5 w-3.5" />
                      Contract on file — {terms.job_title || 'role per contract'}, basic {formatZAR(terms.basic_salary)}
                      {terms.start_date ? `, from ${terms.start_date}` : ''}
                      {(terms.allowances?.length ?? 0) > 0
                        ? ` · allowances: ${terms.allowances!.map((a) => `${a.label} ${formatZAR(a.amount)}${a.sars_code ? ` (${a.sars_code})` : ''}`).join(', ')}`
                        : ''}
                    </span>
                  ) : (
                    <span className="text-amber-300">No contract on file — using manual rate</span>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-base">Tax settings</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="paye">PAYE %</Label>
              <Input id="paye" inputMode="decimal" value={settings.paye_pct}
                onChange={(e) => setSettings({ ...settings, paye_pct: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uif">UIF ceiling (ZAR / month)</Label>
              <Input id="uif" inputMode="decimal" value={settings.uif_ceiling}
                onChange={(e) => setSettings({ ...settings, uif_ceiling: Number(e.target.value) })} />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch id="sdl" checked={settings.sdl_applies}
                onCheckedChange={(v) => setSettings({ ...settings, sdl_applies: v })} />
              <Label htmlFor="sdl">SDL applies (1%, employer)</Label>
            </div>
          </div>
          <Button variant="outline" onClick={saveSettings} disabled={savingSettings}>
            {savingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save tax settings
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-base">Run payroll</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="ps">Period start</Label>
              <Input id="ps" type="date" value={periodStart} onChange={(e) => { setPeriodStart(e.target.value); setPreview(null); }} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pe">Period end</Label>
              <Input id="pe" type="date" value={periodEnd} onChange={(e) => { setPeriodEnd(e.target.value); setPreview(null); }} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pd">Pay date</Label>
              <Input id="pd" type="date" value={payDate} onChange={(e) => { setPayDate(e.target.value); setPreview(null); }} />
            </div>
          </div>

          <Button onClick={runPreview}>
            <Calculator className="mr-2 h-4 w-4" /> Preview payroll
          </Button>

          {preview && (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-lg border border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Line item</TableHead>
                      <TableHead>SARS code</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.lines.map((l) => (
                      <Fragment key={l.employee_id}>
                        <TableRow className="bg-background/40">
                          <TableCell className="font-medium">
                            {l.employee_name}
                            <span className={`ml-2 text-[10px] uppercase ${l.source === 'contract' ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {l.source === 'contract' ? 'contract' : 'manual rate'}
                            </span>
                          </TableCell>
                          <TableCell colSpan={2} className="text-xs text-muted-foreground">
                            Gross {formatZAR(l.gross)} · deductions {formatZAR(l.deductions)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-emerald-300">Net {formatZAR(l.net)}</TableCell>
                        </TableRow>
                        {l.line_items.map((li, idx) => (
                          <TableRow key={`${l.employee_id}-${idx}`}>
                            <TableCell />
                            <TableCell className="text-sm">
                              {li.label}
                              {li.kind === 'employer' && (
                                <span className="ml-2 text-[10px] uppercase text-muted-foreground">employer</span>
                              )}
                            </TableCell>
                            <TableCell><Badge variant="outline">{li.sars_code}</Badge></TableCell>
                            <TableCell className={`text-right ${li.kind === 'deduction' ? 'text-orange-400' : ''}`}>
                              {li.kind === 'deduction' ? '−' : ''}{formatZAR(li.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid gap-2 rounded-lg border border-border/60 bg-background/40 p-3 text-sm sm:grid-cols-3">
                <p>Total gross: <strong>{formatZAR(preview.totals.gross)}</strong></p>
                <p>Total net pay: <strong>{formatZAR(preview.totals.net)}</strong></p>
                <p>PAYE (4102): <strong>{formatZAR(preview.totals.paye)}</strong></p>
                <p>UIF employee (4141): <strong>{formatZAR(preview.totals.uif_employee)}</strong></p>
                <p>UIF employer + SDL: <strong>{formatZAR(preview.employer_contributions)}</strong></p>
                <p>Total cost to company: <strong>{formatZAR(preview.total_cost)}</strong></p>
              </div>

              <Button onClick={() => setConfirmOpen(true)}>
                <ShieldCheck className="mr-2 h-4 w-4" /> Approve &amp; run payroll
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-base">Payroll history</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {runs.length === 0 && <p className="text-sm text-muted-foreground">No payroll has been run yet.</p>}
          {runs.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/40 px-3 py-2">
              <div>
                <p className="text-sm font-medium">{r.period_start} → {r.period_end}</p>
                <p className="text-xs text-muted-foreground">Paid {new Date(r.pay_date).toLocaleDateString('en-ZA')}</p>
              </div>
              <div className="text-right text-sm">
                <p>Cost to company <strong>{formatZAR(r.total_cost)}</strong></p>
                <p className="text-xs text-muted-foreground">Employer contributions {formatZAR(r.employer_fica)}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve and run this payroll?</AlertDialogTitle>
            <AlertDialogDescription>
              This commits {preview?.lines.length ?? 0} payslip{(preview?.lines.length ?? 0) === 1 ? '' : 's'} for{' '}
              {periodStart} → {periodEnd}, total cost to company {formatZAR(preview?.total_cost ?? 0)}. It is logged to
              payroll history and posted as a Payroll expense. These are simplified estimates — verify with SARS or a
              registered practitioner before paying or filing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={committing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                commit();
              }}
              disabled={committing}
            >
              {committing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Approve &amp; run payroll
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
