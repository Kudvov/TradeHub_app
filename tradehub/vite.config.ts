import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		// 5173 часто занят другим Vite-проектом на той же машине
		port: 5174,
		strictPort: false
	}
});
