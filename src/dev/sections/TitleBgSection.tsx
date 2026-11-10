import { PixelSprite } from '../../render/PixelSprite';

export function TitleBgSection() {
  return (
    <section style={{ marginBottom: '32px' }}>
      <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>
        타이틀 배경 (원본, 지역·낮밤 무관)
      </h2>
      <div
        style={{
          display: 'inline-block',
          padding: '16px',
          background: '#1e293b',
          borderRadius: '8px',
        }}
      >
        <PixelSprite id="bg-title-adventure-512" scale={1} />
      </div>
    </section>
  );
}
