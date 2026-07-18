import "./coming-soon.css";

// Henuz yapilmamis modul icin durust yer tutucu (kabuk gercek, veri durust).
export default function ComingSoon({ moduleName }: { moduleName: string }) {
  return (
    <div className="coming-soon">
      <div className="coming-soon__card">
        <h1 className="coming-soon__title">{moduleName}</h1>
        <p className="coming-soon__note">Bu modül yakında eklenecek.</p>
      </div>
    </div>
  );
}
