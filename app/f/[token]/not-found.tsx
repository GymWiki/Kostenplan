export default function FactuurNietGevonden() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center gap-2 px-6 text-center">
      <h1 className="text-xl font-semibold">Deze factuur is niet beschikbaar</h1>
      <p className="text-neutral-600">De link klopt niet of de factuur is nog niet verstuurd. Neem contact op met het bedrijf dat je de factuur stuurde.</p>
    </main>
  );
}
