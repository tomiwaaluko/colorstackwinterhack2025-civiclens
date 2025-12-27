import { Link } from "react-router-dom";
import { CheckCircle, ExternalLink, Users, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PoliticianCardProps {
  id: string;
  name: string;
  party: string;
  state: string;
  position: string;
  image?: string;
  verifiedVotes: number;
  verifiedStatements: number;
  featured?: boolean;
}

export function PoliticianCard({
  id,
  name,
  party,
  state,
  position,
  image,
  verifiedVotes,
  verifiedStatements,
  featured,
}: PoliticianCardProps) {
  const partyColor = party === "Democrat" ? "bg-blue-100 text-blue-800" : party === "Republican" ? "bg-red-100 text-red-800" : "bg-muted text-muted-foreground";

  return (
    <Link
      to={`/politician/${id}`}
      className={`civic-card group block p-6 ${featured ? "ring-2 ring-accent" : ""}`}
    >
      <div className="flex items-start gap-4">
        <div className="relative">
          <div className="h-16 w-16 rounded-full bg-muted overflow-hidden">
            {image ? (
              <img src={image} alt={name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                <Users className="h-8 w-8" />
              </div>
            )}
          </div>
          {featured && (
            <div className="absolute -bottom-1 -right-1 p-1 bg-accent rounded-full">
              <CheckCircle className="h-4 w-4 text-accent-foreground" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-serif text-lg font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {name}
            </h3>
            <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="secondary" className={partyColor}>
              {party}
            </Badge>
            <span className="text-sm text-muted-foreground">{state}</span>
          </div>
          
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
            <Building2 className="h-4 w-4" />
            <span>{position}</span>
          </div>
          
          <div className="flex items-center gap-4 pt-3 border-t border-border">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-foreground">{verifiedVotes}</span>
              <span className="text-xs text-muted-foreground">votes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-foreground">{verifiedStatements}</span>
              <span className="text-xs text-muted-foreground">statements</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
