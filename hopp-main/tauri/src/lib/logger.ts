import { Logger } from "tslog";

const isDevelopment = import.meta.env.DEV;

const logger = new Logger({
  name: "MyApp",
  minLevel: isDevelopment ? 2 : 5,
  stylePrettyLogs: false,
});

export default logger;
