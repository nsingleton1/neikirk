export function RotateOverlay() {
  return (
    <div className="overlay-full">
      <div style={{ fontSize: 48 }}>📱</div>
      <div style={{ fontSize: 20, fontWeight: "bold" }}>
        Please rotate your phone back to portrait
      </div>
      <div style={{ opacity: 0.7 }}>The game is paused.</div>
    </div>
  );
}
