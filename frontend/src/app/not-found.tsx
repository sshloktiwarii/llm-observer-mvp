export default function NotFound() {
  return (
    <div className="min-h-flex flex h-full items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-6">404</h1>
        <p className="text-lg text-muted-foreground mb-6">Page not found</p>
        <a href="/" className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors">
          Return to Home
        </a>
      </div>
    </div>
  );
}
