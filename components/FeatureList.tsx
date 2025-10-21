type Props = {
  items: string[];
};

export default function FeatureList({ items }: Props) {
  return (
    <ul className="list-disc pl-6 text-gray-700">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
