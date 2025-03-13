import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Create models directory if it doesn't exist
const modelsDir = path.join(process.cwd(), 'public', 'models');
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

// Download face-api.js model files
const modelFiles = [
  'face_expression_model-shard1',
  'face_expression_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'tiny_face_detector_model-weights_manifest.json'
];

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

for (const file of modelFiles) {
  const filePath = path.join(modelsDir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`Downloading ${file}...`);
    const url = `${baseUrl}/${file}`;
    execSync(`curl -o "${filePath}" "${url}"`);
  }
}

console.log('Setup complete! You can now run "npm run dev" to start the development server.');