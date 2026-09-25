export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure your LLM Observer preferences
          </p>
        </header>
        
        <div className="bg-card rounded-lg border border-muted/20 p-6 backdrop-blur-sm">
          <h2 className="text-lg font-semibold mb-4">General Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Theme</span>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
                <span className="text-sm font-medium">Dark (Default)</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Refresh Interval</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm">30s</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Notifications</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Enabled</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 bg-card rounded-lg border border-muted/20 p-6 backdrop-blur-sm">
          <h2 className="text-lg font-semibold mb-4">Data Retention</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Event Storage</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">90 days</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Log Level</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Info</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 bg-card rounded-lg border border-muted/20 p-6 backdrop-blur-sm">
          <h2 className="text-lg font-semibold mb-4">API Configuration</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Collection Service URL</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">http://localhost:8080</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Request Timeout</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm">5s</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
