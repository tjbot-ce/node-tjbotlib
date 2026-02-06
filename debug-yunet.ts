/**
 * Debug script to check raw YuNet ONNX output values
 */
import fs from 'fs';
import * as ort from 'onnxruntime-node';
import sharp from 'sharp';
import path from 'path';

const modelPath = path.join('/home/pi/.tjbot/models/vision/yunet', 'face_detection_yunet_2023mar.onnx');

async function main() {
    try {
        // Load a test image
        const testImagePath = '/tmp/tjbot-vision-test-annotated-1738848240559.jpg';
        if (!fs.existsSync(testImagePath)) {
            console.log('No test image found. Run the vision test first to generate an image.');
            return;
        }

        // Read and preprocess image
        const { data } = await sharp(testImagePath)
            .resize(640, 640)
            .removeAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        // Normalize to [0,1]
        const float = new Float32Array(data.length);
        for (let i = 0; i < data.length; ++i) float[i] = data[i] / 255.0;

        // Convert to NCHW format [1, 3, 640, 640]
        const input = new Float32Array(3 * 640 * 640);
        for (let y = 0; y < 640; ++y) {
            for (let x = 0; x < 640; ++x) {
                for (let c = 0; c < 3; ++c) {
                    input[c * 640 * 640 + y * 640 + x] = float[y * 640 * 3 + x * 3 + c];
                }
            }
        }

        const inputTensor = new ort.Tensor('float32', input, [1, 3, 640, 640]);

        // Run inference
        const session = await ort.InferenceSession.create(modelPath);
        const feeds: Record<string, ort.Tensor> = {};
        feeds[session.inputNames[0]] = inputTensor;
        const results = await session.run(feeds);

        // Check raw values from stride 8
        const cls8 = results['cls_8'].data as Float32Array;
        const bbox8 = results['bbox_8'].data as Float32Array;

        // Stride 8: grid is 640/8 = 80x80 = 6400 cells
        const gridW = 80;
        const gridH = 80;

        console.log('\n=== STRIDE 8 ANALYSIS ===');
        console.log(`Grid size: ${gridW}x${gridH} = ${gridW * gridH} cells`);
        console.log(`cls_8 length: ${cls8.length}`);
        console.log(`bbox_8 length: ${bbox8.length}`);

        // Sample a few grid cells
        const samplesToCheck = [0, 100, 500, 1000, 2000, 6399];
        
        console.log('\nSample raw bbox values (format: [delta_cx, delta_cy, log_w, log_h]):');
        for (const idx of samplesToCheck) {
            const bx = bbox8[idx * 4];
            const by = bbox8[idx * 4 + 1];
            const bw = bbox8[idx * 4 + 2];
            const bh = bbox8[idx * 4 + 3];
            console.log(`  Cell ${idx}: [${bx.toFixed(4)}, ${by.toFixed(4)}, ${bw.toFixed(4)}, ${bh.toFixed(4)}]`);
        }

        // Check range of values
        let minBx = Infinity, maxBx = -Infinity;
        let minBw = Infinity, maxBw = -Infinity;
        let countLargeBoxes = 0;

        for (let i = 0; i < cls8.length; i++) {
            const bx = bbox8[i * 4];
            const _by = bbox8[i * 4 + 1];
            const bw = bbox8[i * 4 + 2];
            const _bh = bbox8[i * 4 + 3];
            
            minBx = Math.min(minBx, bx);
            maxBx = Math.max(maxBx, bx);
            minBw = Math.min(minBw, bw);
            maxBw = Math.max(maxBw, bw);
            
            // If treating as log-space: exp(bw) * 8
            const expW = Math.exp(bw) * 8;
            if (expW > 50) countLargeBoxes++;
        }

        console.log('\nBBox coordinate ranges:');
        console.log(`  delta_cx range: [${minBx.toFixed(4)}, ${maxBx.toFixed(4)}]`);
        console.log(`  log_w range: [${minBw.toFixed(4)}, ${maxBw.toFixed(4)}]`);
        console.log(`  Boxes with exp(log_w)*8 > 50 pixels: ${countLargeBoxes}`);

        // Test transformation
        console.log('\n=== TRANSFORMATION TEST ===');
        console.log('For grid cell (40, 40) with raw [0.1, 0.1, 1.0, 1.0]:');
        const testC = 40, testR = 40, testStride = 8;
        const testCx = (testC + 0.1) * testStride;
        const testCy = (testR + 0.1) * testStride;
        const testW = Math.exp(1.0) * testStride;
        const testH = Math.exp(1.0) * testStride;
        console.log(`  Pixel coords: cx=${testCx.toFixed(1)}, cy=${testCy.toFixed(1)}, w=${testW.toFixed(1)}, h=${testH.toFixed(1)}`);
        console.log(`  Normalized (÷640): cx=${(testCx/640).toFixed(3)}, cy=${(testCy/640).toFixed(3)}, w=${(testW/640).toFixed(3)}, h=${(testH/640).toFixed(3)}`);

        console.log('\nIf raw values were already normalized [0-1]:');
        console.log('  Normalized coords would be: cx=0.1, cy=0.1, w=1.0, h=1.0');

    } catch (error) {
        console.error('Error:', error);
    }
}

main();
