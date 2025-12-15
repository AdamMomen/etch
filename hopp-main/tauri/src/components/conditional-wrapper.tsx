export const ConditionalWrap = ({
  condition,
  children,
  wrap,
}: {
  condition: boolean;
  wrap: (children: React.ReactNode) => React.ReactNode;
  children: React.ReactNode;
}) => (condition ? wrap(children) : children);
