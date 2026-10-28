export default function LayoutEstudiante({ children }: LayoutProps<"/">) {
  return (
    <div className="estudiante flex min-h-dvh flex-1 justify-center bg-e-bg text-e-ink">
      <div className="flex w-full max-w-md flex-col">{children}</div>
    </div>
  );
}
