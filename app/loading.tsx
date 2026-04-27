export default function Loading() {
  return (
    <div
      style={{
        backgroundColor: "#111111",
        color: "white",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column"
      }}
    >
      <img
        src="/logo.png"
        alt="DOKAN"
        style={{ width: 120, height: 120, marginBottom: 20 }}
      />
      <h2>DOKAN</h2>
    </div>
  );
}
