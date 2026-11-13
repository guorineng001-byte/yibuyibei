import {configDefaults,defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';
// @ts-ignore Local build helper runs in Node.
import {offlinePlugin} from './scripts/offline-plugin.mjs';
export default defineConfig({plugins:[react(),offlinePlugin()],build:{chunkSizeWarningLimit:1000},test:{exclude:[...configDefaults.exclude,'release/**']}});
