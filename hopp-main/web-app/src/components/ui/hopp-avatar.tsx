import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { clsx } from "clsx";

interface HoppAvatarProps {
  src?: string;
  firstName: string;
  lastName: string;
  className?: string;
}

export const HoppAvatar = ({ src, firstName, lastName, className }: HoppAvatarProps) => {
  return (
    <div className="relative">
      <Avatar
        className={clsx(
          "size-10 shrink-0 rounded-md bg-slate-800 flex justify-center items-center overflow-hidden text-white",
          className,
        )}
      >
        <AvatarImage src={src || ""} />
        <AvatarFallback>
          {firstName[0]}
          {lastName[0]}
        </AvatarFallback>
      </Avatar>
    </div>
  );
};
