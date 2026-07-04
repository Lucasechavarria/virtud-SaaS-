/**
 * Cargador dinámico para MediaPipe Pose desde CDN.
 * Evita la inclusión de binarios WASM pesados en el bundle de Next.js
 * y previene errores de empaquetado SSR.
 */

export interface MediaPipePoseConfig {
    locateFile: (file: string) => string;
}

export interface MediaPipePoseResults {
    poseLandmarks: Array<{ x: number; y: number; z: number; visibility: number }>;
}

export class MediaPipeLoader {
    private static isLoaded = false;
    private static loadPromise: Promise<void> | null = null;

    /**
     * Carga el script de MediaPipe Pose desde el CDN si no está cargado.
     */
    public static load(): Promise<void> {
        if (typeof window === 'undefined') {
            return Promise.resolve();
        }

        if (this.isLoaded) {
            return Promise.resolve();
        }

        if (this.loadPromise) {
            return this.loadPromise;
        }

        this.loadPromise = new Promise<void>((resolve, reject) => {
            // Verificar si ya está cargado globalmente
            if ((window as any).Pose) {
                this.isLoaded = true;
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js';
            script.async = true;
            script.onload = () => {
                this.isLoaded = true;
                resolve();
            };
            script.onerror = (err) => {
                this.loadPromise = null;
                reject(new Error('Error al cargar MediaPipe Pose desde el CDN: ' + err));
            };

            document.body.appendChild(script);
        });

        return this.loadPromise;
    }

    /**
     * Crea y configura una instancia de MediaPipe Pose.
     */
    public static async createPoseInstance(
        onResultsCallback: (results: MediaPipePoseResults) => void
    ): Promise<any> {
        await this.load();

        if (typeof window === 'undefined' || !(window as any).Pose) {
            throw new Error('MediaPipe Pose no está disponible globalmente en el navegador.');
        }

        const PoseConstructor = (window as any).Pose;
        const pose = new PoseConstructor({
            locateFile: (file: string) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
            }
        });

        pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        pose.onResults((results: any) => {
            if (results && results.poseLandmarks) {
                onResultsCallback(results);
            }
        });

        return pose;
    }
}
