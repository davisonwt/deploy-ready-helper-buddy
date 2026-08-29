import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpenCheck, LayoutDashboard, Loader2, Settings2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    loading: bizLoading, businesses, current, setCurrent, saving,
    updateBusiness, applyCountryPreset,
  } = useBooksBusiness();
  const books = useBooksData(current?.id ?? null);

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-primary/10 p-2 text-primary">
            <BookOpenCheck className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">Books</h1>
            <p className="text-sm text-muted-foreground">
              {current ? `${current.name} · private business finance` : 'Private business finance for your tribe business'}
            </p>
          </div>
        </div>
        {businesses.length > 0 && (
          <div className="flex items-center gap-2">
            {businesses.length > 1 && current && (
              <Select value={current.id} onValueChange={setCurrent}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {businesses.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Link to="/profile">
              <Button variant="outline" size="sm">
                <Settings2 className="mr-2 h-4 w-4" /> Manage businesses
              </Button>
            </Link>
          </div>
        )}
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

  if (businesses.length === 0 || !current) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        {header}
        <Card className="border-border/60 bg-card/50 backdrop-blur">
          <CardHeader><CardTitle className="text-base">Books is for tribe businesses</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Set up a business in your profile — that's your set of books, ready the moment you add it.</p>
            <Link to="/profile">
              <Button>Set up my business</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <BooksCurrencyProvider currency={current.currency}>
      <div className="mx-auto max-w-6xl px-4 py-10">
        {header}

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 border border-border/60 bg-card/70 p-1 backdrop-blur">
            {[
              ['dashboard', 'Dashboard'],
              ['invoices', 'Invoices'],
              ['expenses', 'Expenses'],
              ['catalog', 'Catalog'],
              ['payroll', 'Payroll'],
              ['reports', 'Reports'],
              ['settings', 'Settings'],
            ].map(([v, label]) => (
              <TabsTrigger
                key={v}
                value={v}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-foreground/80 hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="dashboard">
            <BooksDashboardTab invoices={books.invoices} expenses={books.expenses} />
          </TabsContent>
          <TabsContent value="invoices">
            <InvoicesTab
              businessId={current.id}
              invoices={books.invoices}
              items={books.items}
              onChanged={books.reload}
            />
          </TabsContent>
          <TabsContent value="expenses">
            <ExpensesTab businessId={current.id} expenses={books.expenses} onChanged={books.reload} />
          </TabsContent>
          <TabsContent value="catalog">
            <CatalogTab
              businessId={current.id}
              booksEnabled={Boolean(current.books_enabled)}
              items={books.items}
              income={books.income}
              onChanged={books.reload}
            />
          </TabsContent>
          <TabsContent value="payroll">
            <PayrollTab
              businessId={current.id}
              country={current.country ?? null}
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
            <BooksSettingsTab
              business={current}
              deductions={books.deductions}
              saving={saving}
              onUpdateBusiness={updateBusiness}
              onApplyPreset={applyCountryPreset}
              onChanged={books.reload}
            />
          </TabsContent>
        </Tabs>
      </div>
    </BooksCurrencyProvider>
  );
}

