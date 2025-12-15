import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { FcAddImage } from "react-icons/fc";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";

interface FileInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  acceptedFileTypes?: string;
  maxSize?: number; // in MB
  onFileSelect?: (file: File | null) => void;
  className?: string;
}

const FileInput = React.forwardRef<HTMLInputElement, FileInputProps>(
  ({ className, acceptedFileTypes, maxSize = 15, onFileSelect, ...props }, ref) => {
    const [dragActive, setDragActive] = React.useState(false);
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

    const handleDrag = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "dragenter" || e.type === "dragover") {
        setDragActive(true);
      } else if (e.type === "dragleave") {
        setDragActive(false);
      }
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const file = e.dataTransfer.files?.[0];
      handleFile(file);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      handleFile(file);
    };

    const handleFile = (file: File | undefined) => {
      if (!file) return;

      if (maxSize && file.size > maxSize * 1024 * 1024) {
        alert(`File size must be less than ${maxSize}MB`);
        return;
      }

      setSelectedFile(file);
      onFileSelect?.(file);
    };

    const handleButtonClick = async () => {
      try {
        const filePath = await open({
          multiple: false,
          directory: false,
          filters: [
            {
              name: acceptedFileTypes || "Images",
              extensions: ["png", "jpg", "jpeg", "mp4"],
            },
          ],
        });

        if (filePath && typeof filePath === "string") {
          // Create a File object from the selected file path
          console.log(filePath);
          const file_blob = await readFile(filePath);
          const file = new File([file_blob], filePath.split("/").pop() || "file");

          handleFile(file);
        }
      } catch (error) {
        console.error("Error selecting file:", error);
      }
    };

    return (
      <div
        className={cn(
          "w-full py-4 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 transition-colors duration-200",
          dragActive && "border-slate-400 bg-slate-100",
          className,
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="grid gap-1">
          <FcAddImage className="mx-auto text-3xl text-slate-500" />
          <h3 className="text-center text-slate-500 text-xs">
            {acceptedFileTypes || "PNG, JPG or PDF"}, smaller than {maxSize}MB
          </h3>
        </div>
        <div className="grid gap-2 mt-2">
          <h4 className="text-center text-slate-900 text-sm font-medium">
            {selectedFile ? selectedFile.name : "Drag and Drop your file here or"}
          </h4>
          <div className="flex items-center justify-center">
            <input
              {...props}
              ref={ref}
              type="file"
              className="hidden"
              onChange={handleChange}
              accept={acceptedFileTypes}
            />
            <Button type="button" variant="default" size="sm" onClick={handleButtonClick}>
              Choose File
            </Button>
          </div>
        </div>
      </div>
    );
  },
);

FileInput.displayName = "FileInput";

export { FileInput };
