declare module "@/camera/connect-example.mjs" {
  export type CameraCandidate = {
    rank: number;
    class_index: number;
    name_ko: string;
    score: number; // 0~1, 모델 점수
    card_id: string | null; // 예: b-160
    mapping_status: string;
  };
  export type CameraOpenInfo = { cardId: string; poiId: string; serial: number };
  export type CameraStateInfo = { status: string; code?: unknown; [key: string]: unknown };
  export type CameraFeature = {
    enter(): Promise<void>;
    selectPhoto(file: Blob): Promise<void>;
    choose(candidate: CameraCandidate): void;
    leave(): void;
    destroy(): Promise<void>;
  };
  export function createCameraFeature(options: {
    onState: (state: CameraStateInfo) => void;
    onCandidates: (candidates: CameraCandidate[]) => void;
    onOpenBuilding: (info: CameraOpenInfo) => void;
    onError: (code: string, message: string) => void;
  }): Promise<CameraFeature>;
}
