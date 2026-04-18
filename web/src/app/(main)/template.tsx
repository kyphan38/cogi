export default function MainTemplate({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="cogi-main-route-enter flex flex-1 flex-col">{children}</div>;
}
