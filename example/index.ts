// Required for Fast Refresh and the web bundle entry. No-op on native.
import "@expo/metro-runtime";
import { registerRootComponent } from "expo";

import App from "./App";

registerRootComponent(App);
