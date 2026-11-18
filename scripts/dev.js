// Levanta backend y frontend juntos con `npm run dev` desde la raíz.
// - El backend corre "de fondo" y sus mensajes salen con el prefijo [api].
// - Expo se queda con la terminal, así el QR y las teclas (a, w, r...) siguen andando.
// - Al cerrar uno (o Ctrl+C), se cierra el otro.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backendDir = path.join(root, 'Sk-Backend');
const frontendDir = path.join(root, 'Sk-Frontend');
const isWindows = process.platform === 'win32';

for (const dir of [backendDir, frontendDir]) {
  if (!existsSync(path.join(dir, 'node_modules'))) {
    console.error(`Faltan dependencias en ${path.basename(dir)}. Corré primero: npm run install:all`);
    process.exit(1);
  }
}

// Usa los certificados del sistema operativo (soluciona el error
// "self-signed certificate" al llamar a Deezer en redes con proxy/antivirus).
// Solo se agrega si la versión de Node lo soporta (>= 22.15 o >= 23.8).
const [major, minor] = process.versions.node.split('.').map(Number);
const supportsSystemCa = major > 23 || (major === 23 && minor >= 8) || (major === 22 && minor >= 15);
const backendEnv = { ...process.env };
if (supportsSystemCa && !backendEnv.NODE_OPTIONS?.includes('--use-system-ca')) {
  backendEnv.NODE_OPTIONS = `${backendEnv.NODE_OPTIONS ?? ''} --use-system-ca`.trim();
}

const prefixLines = (stream, out, prefix) => {
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop();
    for (const line of lines) out.write(`${prefix} ${line}\n`);
  });
};

const backend = spawn('npm run dev', {
  cwd: backendDir,
  env: backendEnv,
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});
prefixLines(backend.stdout, process.stdout, '\x1b[36m[api]\x1b[0m');
prefixLines(backend.stderr, process.stderr, '\x1b[31m[api]\x1b[0m');

const frontend = spawn('npx expo start', {
  cwd: frontendDir,
  shell: true,
  stdio: 'inherit',
});

// En Windows hay que matar el árbol de procesos (npm -> nodemon -> node).
const killTree = (child) => {
  if (!child || child.exitCode !== null || child.killed) return;
  if (isWindows) {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    child.kill('SIGTERM');
  }
};

let closing = false;
const shutdown = (code = 0) => {
  if (closing) return;
  closing = true;
  killTree(backend);
  killTree(frontend);
  process.exit(code);
};

backend.on('exit', (code) => {
  if (closing) return;
  console.error(`\n[api] El backend se cerró (código ${code}). Cerrando todo...`);
  shutdown(code ?? 1);
});
frontend.on('exit', (code) => shutdown(code ?? 0));
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
