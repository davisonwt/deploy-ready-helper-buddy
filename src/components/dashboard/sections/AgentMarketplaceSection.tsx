import React, { useState } from 'react';
import { Bot, Plus, Check, Power, Trash2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { DashboardTheme } from '@/utils/dashboardThemes';
import { SectionHeading } from './SectionHeading';
import { useAgentMarketplace, AgentTemplate } from '@/hooks/useAgentMarketplace';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Props { theme: DashboardTheme; }

export const AgentMarketplaceSection: React.FC<Props> = ({ theme }) => {
  const { templates, installs, myDrafts, loading, installTemplate, startPaidInstall, toggleInstall, uninstall, submitTemplate } = useAgentMarketplace();
  const [activeTab, setActiveTab] = useState<'browse' | 'installed' | 'mine'>('browse');
  const [submitOpen, setSubmitOpen] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);

  const installedIds = new Set(installs.map(i => i.template_id));

  const handleInstall = async (t: AgentTemplate) => {
    if (t.install_bestowal_amount > 0) {
      setPaying(t.id);
      const { error, invoiceUrl } = await startPaidInstall(t.id);
      setPaying(null);
      if (error) {
        toast.error(error);
        return;
      }
      if (invoiceUrl) {
        toast.success(`Opening payment for ${t.name}…`);
        window.open(invoiceUrl, '_blank', 'noopener,noreferrer');
      }
      return;
    }
    const { error } = await installTemplate(t.id);
    if (error) toast.error('Could not install agent');
    else toast.success(`${t.name} installed`);
  };

  return (
    <div className="space-y-4">
      <SectionHeading
        icon={Bot}
        title="Agent Marketplace"
        subtitle="Install AI agents or publish your own"
        theme={theme}
        gradientColors={['#a855f7', '#ec4899']}
        rightSlot={
          <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="gap-1">
                <Plus className="w-4 h-4" /> Publish
              </Button>
            </DialogTrigger>
            <SubmitTemplateDialog
              onSubmit={async (payload) => {
                const { error } = await submitTemplate(payload);
                if (error) toast.error('Could not submit');
                else { toast.success('Submitted for council review'); setSubmitOpen(false); }
              }}
            />
          </Dialog>
        }
      />

      {/* Tab switcher */}
      <div className="flex gap-1 bg-card/50 p-1 rounded-xl">
        {(['browse', 'installed', 'mine'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition ${
              activeTab === tab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            {tab === 'browse' ? `Browse (${templates.length})` : tab === 'installed' ? `Installed (${installs.length})` : `My Drafts (${myDrafts.length})`}
          </button>
        ))}
      </div>

      {loading && <p className="text-xs text-muted-foreground text-center py-4">Loading agents…</p>}

      {!loading && activeTab === 'browse' && (
        <div className="grid gap-3">
          {templates.map(t => (
            <TemplateCard
              key={t.id}
              template={t}
              installed={installedIds.has(t.id)}
              paying={paying === t.id}
              onInstall={() => handleInstall(t)}
            />
          ))}
          {templates.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No agents available yet.</p>
          )}
        </div>
      )}

      {!loading && activeTab === 'installed' && (
        <div className="grid gap-3">
          {installs.map(inst => {
            const tpl = templates.find(t => t.id === inst.template_id);
            if (!tpl) return null;
            return (
              <motion.div
                key={inst.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-card border border-border/40 p-3 flex items-center gap-3"
              >
                <div className="text-2xl">{tpl.icon || '🤖'}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{tpl.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {inst.enabled ? 'Active' : 'Paused'} · {inst.run_count} runs
                  </p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => toggleInstall(inst.id, !inst.enabled)}>
                  <Power className={`w-4 h-4 ${inst.enabled ? 'text-green-500' : 'text-muted-foreground'}`} />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => uninstall(inst.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </motion.div>
            );
          })}
          {installs.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No agents installed yet. Browse the marketplace.</p>
          )}
        </div>
      )}

      {!loading && activeTab === 'mine' && (
        <div className="grid gap-3">
          {myDrafts.map(t => (
            <div key={t.id} className="rounded-xl bg-card border border-border/40 p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{t.icon || '🤖'}</span>
                <p className="text-sm font-semibold text-foreground flex-1">{t.name}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  t.status === 'pending_review' ? 'bg-amber-500/20 text-amber-600' :
                  t.status === 'rejected' ? 'bg-destructive/20 text-destructive' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {t.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
            </div>
          ))}
          {myDrafts.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">You haven't submitted any agents yet.</p>
          )}
        </div>
      )}
    </div>
  );
};

const TemplateCard: React.FC<{ template: AgentTemplate; installed: boolean; paying?: boolean; onInstall: () => void; }> = ({ template, installed, paying = false, onInstall }) => {
  const isPaid = template.install_bestowal_amount > 0;
  const label = installed
    ? <><Check className="w-3 h-3 mr-1" /> Installed</>
    : paying
      ? 'Opening…'
      : isPaid
        ? `Bestow ${template.currency} ${template.install_bestowal_amount}`
        : 'Install';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-card border border-border/40 p-3"
    >
      <div className="flex items-start gap-3">
        <div className="text-3xl">{template.icon || '🤖'}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-foreground truncate">{template.name}</p>
            {template.is_featured && <Sparkles className="w-3 h-3 text-amber-500" />}
          </div>
          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{template.description}</p>
          <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
            <span className="capitalize">{template.category}</span>
            <span>· {template.installs_count} installs</span>
            {isPaid && (
              <span className="text-primary font-semibold">{template.currency} {template.install_bestowal_amount}</span>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant={installed ? 'secondary' : 'default'}
          disabled={installed || paying}
          onClick={onInstall}
          className="shrink-0"
        >
          {label}
        </Button>
      </div>
    </motion.div>
  );
};

const SubmitTemplateDialog: React.FC<{ onSubmit: (p: any) => void }> = ({ onSubmit }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('🤖');
  const [category, setCategory] = useState('general');
  const [prompt, setPrompt] = useState('');
  const [bestowal, setBestowal] = useState(0);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Publish an Agent Template</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-[60px_1fr] gap-2">
          <div>
            <Label className="text-xs">Icon</Label>
            <Input value={icon} onChange={e => setIcon(e.target.value)} maxLength={2} />
          </div>
          <div>
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="My Helpful Agent" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Category</Label>
          <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="content / mentorship / analytics" />
        </div>
        <div>
          <Label className="text-xs">Description</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
        </div>
        <div>
          <Label className="text-xs">Prompt template</Label>
          <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} placeholder="Describe what the agent should do..." />
        </div>
        <div>
          <Label className="text-xs">Install bestowal (USD, 0 = free)</Label>
          <Input type="number" min={0} value={bestowal} onChange={e => setBestowal(Number(e.target.value))} />
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={() => onSubmit({ name, description, icon, category, prompt_template: prompt, install_bestowal_amount: bestowal })}
          disabled={!name || !description || !prompt}
        >
          Submit for Council Review
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};
