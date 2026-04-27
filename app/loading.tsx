export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5efe3]">
      <div className="flex flex-col items-center gap-4">
        <img
          src="/logo.png"
          alt="DOKAN Bratislava"
          className="h-28 w-28 animate-pulse rounded-3xl shadow-xl"
        />
        <div className="text-center">
          <h1 className="text-2xl font-black">DOKAN</h1>
          <p className="text-sm text-black/60">Trénerská zóna</p>
        </div>
      </div>
    </div>
  );
}
