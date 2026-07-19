export function AccessDenied() {
  return (
    <div className="settings-denied" role="status">
      <p className="settings-denied__title">Bu alana yetkiniz yok</p>
      <p className="settings-denied__note">
        Bu bölümü görüntülemek için gerekli izne sahip değilsiniz. Yetki için sistem yöneticinizle görüşün.
      </p>
    </div>
  );
}
