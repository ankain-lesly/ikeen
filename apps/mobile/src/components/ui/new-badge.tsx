import { Text } from "react-native";

export type Props = {
  text?: string;
  className?: string;
  isAbsolute?: boolean;
};

export function NewBadge({ text = "New", className, isAbsolute =false}: Props) {
  const style = isAbsolute ? " absolute -top-1 -right-2" : "-top-1";
  return (
    <Text
      className={`text-white bg-green-600 px-1 rounded-xl text-[12px] font-semibold ${style} ${className}`}>
      {text}
    </Text>
  );
}
