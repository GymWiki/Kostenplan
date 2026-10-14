import { z } from "zod";

// Alle zod-meldingen die een gebruiker te zien kan krijgen zijn Nederlands (de eigen meldingen in de schema's
// blijven voorgaan). Wordt geïmporteerd door elk bestand dat zod gebruikt, ook de embed en de rekentool-client.
z.config(z.locales.nl());
