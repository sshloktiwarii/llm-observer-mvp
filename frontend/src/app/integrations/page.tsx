import IntegrationsPanel from '@/components/IntegrationsPanel';

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">System Integrations</h1>
          <p className="text-muted-foreground mt-2">
            Configure connections to external tools and services
          </p>
        </header>
        
        <IntegrationsPanel />
      </div>
    </div>
  );
}
