import React from 'react';
import QRCode from 'react-qr-code';

interface QRCodeWrapperProps {
  value: string;
  size?: number;
}

export const QRCodeWrapper: React.FC<QRCodeWrapperProps> = ({ value, size = 128 }) => {
  return (
    <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 inline-block">
      <QRCode
        size={size}
        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
        value={value}
        viewBox={`0 0 256 256`}
      />
    </div>
  );
};