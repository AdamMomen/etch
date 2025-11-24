import React, { useEffect, useState } from "react";
import RoomJoin from "./components/RoomJoin";
import ScreenShareWithAnnotations from "./components/ScreenShareWithAnnotations";
import { useLiveKit } from "./contexts/LiveKitContext";

const App: React.FC = () => {
  const { isConnected } = useLiveKit();
  const [notification, setNotification] = useState<{
    type: "info" | "success" | "error";
    message: string;
  } | null>(null);
  const [permissionHelp, setPermissionHelp] = useState<{
    bundlePath: string;
    executablePath: string;
  } | null>(null);

  useEffect(() => {
    const electron = (window as any).electron;
    if (!electron) return;

    // Listen for permission help messages
    electron.onPermissionHelp?.(
      (data: { bundlePath: string; executablePath: string }) => {
        setPermissionHelp(data);
      }
    );

    // Listen for general messages
    electron.onMessage?.((data: { type: string; message: string }) => {
      setNotification({
        type: data.type as "info" | "success" | "error",
        message: data.message,
      });
      // Auto-hide after 5 seconds
      setTimeout(() => setNotification(null), 5000);
    });

    return () => {
      electron.removePermissionHelpListener?.();
      electron.removeMessageListener?.();
    };
  }, []);

  console.log("isConnected", isConnected);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">NAMELESS</h1>
          <p className="text-gray-600">
            Open-Source Meeting Platform with Annotations
          </p>
        </div>

        {/* Notification banner */}
        {notification && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              notification.type === "success"
                ? "bg-green-100 text-green-800"
                : notification.type === "error"
                ? "bg-red-100 text-red-800"
                : "bg-blue-100 text-blue-800"
            }`}
          >
            {notification.message}
          </div>
        )}

        {/* Permission help modal */}
        {permissionHelp && (
          <div className="mb-4 p-6 bg-white rounded-lg shadow-md border-2 border-blue-500">
            <h3 className="text-lg font-bold mb-3">
              Screen Recording Permission Required
            </h3>
            <p className="mb-4 text-gray-700">
              System Preferences has been opened. Follow these steps:
            </p>
            <ol className="list-decimal list-inside space-y-2 mb-4 text-gray-700">
              <li>Click the lock icon 🔒 and enter your password</li>
              <li>Click the '+' button</li>
              <li>
                Press{" "}
                <kbd className="px-2 py-1 bg-gray-200 rounded">Cmd+Shift+G</kbd>{" "}
                (Go to Folder)
              </li>
              <li>Paste this path:</li>
            </ol>
            <div className="bg-gray-100 p-3 rounded mb-4 font-mono text-sm break-all">
              {permissionHelp.bundlePath}
            </div>
            <ol
              className="list-decimal list-inside space-y-2 mb-4 text-gray-700"
              start={5}
            >
              <li>
                Select <strong>Electron.app</strong> and click 'Open'
              </li>
              <li>Make sure the checkbox is checked ✅</li>
              <li>Completely quit this app (Cmd+Q) and restart</li>
            </ol>
            <button
              onClick={() => setPermissionHelp(null)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Got it
            </button>
          </div>
        )}

        {!isConnected ? <RoomJoin /> : <ScreenShareWithAnnotations />}
      </div>
    </div>
  );
};

export default App;
