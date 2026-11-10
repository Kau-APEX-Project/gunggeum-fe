// 마이크 소리를 서버가 받는 형식으로 바꾸는 부품들
//   형식: PCM 16kHz mono 16bit (BE 11/09 보고서). 브라우저 마이크는 보통 44.1kHz 또는 48kHz 의 실수 값(-1~1)이라서
//   ① 16kHz 로 줄이고(StreamResampler) ② 16bit 정수로 바꾸고(toPcm16) ③ 일정한 크기의 조각으로 자른다(PcmChunker)

export const TARGET_RATE = 16000;

/** 입력 속도(inRate) > 16kHz 로 줄이는 스트리밍 변환 (선형 보간). 블록 경계가 이어지도록 남은 샘플을 기억한다 */
export class StreamResampler {
  private carry = new Float32Array(0);
  private pos = 0; // carry 를 앞에 붙인 버퍼 기준 다음 출력 샘플의 (소수) 위치
  private ratio: number;
  constructor(inRate: number, outRate = TARGET_RATE) {
    this.ratio = inRate / outRate;
  }
  process(input: Float32Array): Float32Array {
    const buf = new Float32Array(this.carry.length + input.length);
    buf.set(this.carry, 0);
    buf.set(input, this.carry.length);
    const out: number[] = [];
    let pos = this.pos;
    while (pos + 1 < buf.length) { // 보간에는 이웃한 두 샘플이 필요
      const i = Math.floor(pos);
      const f = pos - i;
      out.push(buf[i] * (1 - f) + buf[i + 1] * f);
      pos += this.ratio;
    }
    const consumed = Math.min(Math.floor(pos), buf.length);
    this.carry = buf.slice(consumed);
    this.pos = pos - consumed;
    return Float32Array.from(out);
  }
}

/** -1~1 실수 > 16bit 정수 (범위를 넘으면 잘라 냄) */
export function toPcm16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    out[i] = s < 0 ? Math.round(s * 32768) : Math.round(s * 32767);
  }
  return out;
}

/** 16bit 샘플을 frameSamples 개씩 모아 한 조각(ArrayBuffer)으로 내보낸다. 남는 샘플은 다음 호출로 이어짐 */
export class PcmChunker {
  private buf = new Int16Array(0);
  constructor(private frameSamples: number) {}
  push(samples: Int16Array): ArrayBuffer[] {
    const joined = new Int16Array(this.buf.length + samples.length);
    joined.set(this.buf, 0);
    joined.set(samples, this.buf.length);
    const frames: ArrayBuffer[] = [];
    let at = 0;
    while (joined.length - at >= this.frameSamples) {
      frames.push(joined.slice(at, at + this.frameSamples).buffer as ArrayBuffer);
      at += this.frameSamples;
    }
    this.buf = joined.slice(at);
    return frames;
  }
}

/** 마이크 블록(실수) > 서버로 보낼 조각들 */
export class PcmPipeline {
  private resampler: StreamResampler;
  private chunker: PcmChunker;
  constructor(inRate: number, frameSamples: number) {
    this.resampler = new StreamResampler(inRate);
    this.chunker = new PcmChunker(frameSamples);
  }
  push(block: Float32Array): ArrayBuffer[] {
    return this.chunker.push(toPcm16(this.resampler.process(block)));
  }
}
