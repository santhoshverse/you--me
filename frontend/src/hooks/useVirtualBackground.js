import { useEffect, useRef, useState } from 'react';
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';

export default function useVirtualBackground() {
    const [segmentation, setSegmentation] = useState(null);
    const canvasRef = useRef(document.createElement("canvas"));
    const contextRef = useRef(canvasRef.current.getContext("2d"));
    const activeEffect = useRef("none"); // none, blur, image

    // Config
    useEffect(() => {
        const selfieSegmentation = new SelfieSegmentation({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
        });

        selfieSegmentation.setOptions({
            modelSelection: 1, // 0: general (slower, accurate), 1: landscape (faster)
        });

        selfieSegmentation.onResults(onResults);
        setSegmentation(selfieSegmentation);
    }, []);

    const onResults = (results) => {
        const ctx = contextRef.current;
        const canvas = canvasRef.current;

        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);

        // Only overwrite existing pixels.
        ctx.globalCompositeOperation = 'source-in';

        // Draw the foreground (the person)
        // Actually for blur: 
        // 1. Draw mask.
        // 2. Compo 'source-in' -> Draw person. Now alpha is mask * person.
        // 3. Compo 'destination-over' -> Draw background.

        // Better approach for Blur:
        // 1. Draw original image to canvas.
        // 2. Apply blur filter? No, simpler:
        // 1. Draw mask.
        // 2. 'source-in': Draw Video (Person).
        // 3. 'destination-over': Draw Blurred Video (Background) OR Image.

        if (activeEffect.current === 'blur') {
            // Main person
            ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

            // Background (blurred)
            ctx.globalCompositeOperation = 'destination-over';
            ctx.filter = 'blur(10px)';
            ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
            ctx.filter = 'none';
        } else if (activeEffect.current === 'image') {
            // Main person
            ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

            // Background Image
            ctx.globalCompositeOperation = 'destination-over';
            // Placeholder blue background for now
            ctx.fillStyle = '#00BFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
            // None - just pass through
            ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
        }

        ctx.restore();
    };

    const processStream = async (videoElement, effect) => {
        if (!segmentation || !videoElement) return;

        activeEffect.current = effect;

        // Ensure canvas matches video size
        if (canvasRef.current.width !== videoElement.videoWidth) {
            canvasRef.current.width = videoElement.videoWidth;
            canvasRef.current.height = videoElement.videoHeight;
        }

        await segmentation.send({ image: videoElement });
    };

    // Returns the processed stream from the canvas
    const getCanvasStream = () => {
        return canvasRef.current.captureStream(30);
    };

    return {
        processStream,
        getCanvasStream,
        isReady: !!segmentation
    };
}
