import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpenCheck, LayoutDashboard, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBooksBusiness } from '@/hooks/useBooksBusiness';
import { useBooksData } from '@/hooks/useBooksData';
import { BooksCurrencyProvider } from '@/lib/books/currency';
import BooksDashboardTab from '@/components/books/BooksDashboardTab';
import InvoicesTab from '@/components/books/InvoicesTab';
import ExpensesTab from '@/components/books/ExpensesTab';
import PayrollTab from '@/components/books/PayrollTab';
import ReportsTab from '@/components/books/ReportsTab';
import CatalogTab from '@/components/books/CatalogTab';
import BooksSettingsTab from '@/components/books/BooksSettingsTab';

export default function BooksPage() {
  const navigate = useNavigate();
  const {
    loading: bizLoading, business, businessId, isBusinessUser, suggestedName, creating, saving,
    createWorkspace, updateBusiness, applyCountryPreset,
  } = useBooksBusiness();
  const books = useBooksData(businessId);

  const [newName, setNewName] = useState('');

  const header = (
    <div className="mb-6 space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
          <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
        </Button>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-primary/10 p-2 text-primary">
          <BookOpenCheck className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold">Books</h1>
          <p className="text-sm text-muted-foreground">
            {business ? `${business.name} · private business finance` : 'Private business finance for your tribe business'}
          </p>
        </div>
      </div>
    </div>
  );

  if (bizLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        {header}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Opening your books…
        </div>
      </div>
    );
  }

  if (!isBusinessUser) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        {header}
        <Card className="border-border/60 bg-card/50 backdrop-blur">
          <CardHeader><CardTitle className="text-base">Books is for tribe businesses</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>You need a business account on Sow2Grow before you can open a Books workspace.</p>
            <Link to="/seller/business-settings">
              <Button>Set up my business</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!businessId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        {header}
        <Card className="border-border/60 bg-card/50 backdrop-blur">
          <CardHeader><CardTitle className="text-base">Create your Books workspace</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your books are private to this business — only you can read or write them.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="biz-name">Business name</Label>
              <Input
                id="biz-name"
                value={newName || suggestedName || ''}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Your business name"
              />
            </div>
            <Button
              disabled={creating}
              onClick={async () => {
                const name = (newName || suggestedName || '').trim();
                if (!name) return;
                await createWorkspace(name);
              }}
            >
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Open my books
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <BooksCurrencyProvider currency={business?.currency}>
      <div className="mx-auto max-w-6xl px-4 py-10">
        {header}

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="flex w-full flex-wrap justify-start">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="catalog">Catalog</TabsTrigger>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <BooksDashboardTab invoices={books.invoices} expenses={books.expenses} />
          </TabsContent>
          <TabsContent value="invoices">
            <InvoicesTab
              businessId={businessId}
              invoices={books.invoices}
              items={books.items}
              onChanged={books.reload}
            />
          </TabsContent>
          <TabsContent value="expenses">
            <ExpensesTab businessId={businessId} expenses={books.expenses} onChanged={books.reload} />
          </TabsContent>
          <TabsContent value="catalog">
            <CatalogTab
              businessId={businessId}
              booksEnabled={Boolean(business?.books_enabled)}
              items={books.items}
              income={books.income}
              onChanged={books.reload}
            />
          </TabsContent>
          <TabsContent value="payroll">
            <PayrollTab
              businessId={businessId}
              country={business?.country ?? null}
              employees={books.employees}
              contractByEmployee={books.contractByEmployee}
              runs={books.runs}
              deductions={books.deductions}
              onChanged={books.reload}
            />
          </TabsContent>
          <TabsContent value="reports">
            <ReportsTab invoices={books.invoices} expenses={books.expenses} />
          </TabsContent>
          <TabsContent value="settings">
            {business && (
              <BooksSettingsTab
                business={business}
                deductions={books.deductions}
                saving={saving}
                onUpdateBusiness={updateBusiness}
                onApplyPreset={applyCountryPreset}
                onChanged={books.reload}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </BooksCurrencyProvider>
  );
}

