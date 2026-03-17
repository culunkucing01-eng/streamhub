import { Link } from "wouter";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="glass p-12 rounded-3xl text-center max-w-md mx-4 border border-border/50">
        <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-6" />
        <h1 className="text-3xl font-display font-bold text-foreground mb-3">404</h1>
        <p className="text-muted-foreground mb-8 text-lg">The page you are looking for doesn't exist or has been moved.</p>
        <Link 
          href="/" 
          className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors w-full"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
