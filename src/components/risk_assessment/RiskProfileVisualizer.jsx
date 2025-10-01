import React from 'react';

const riskProfiles = [
  { profile: 'Conservative', color: 'bg-blue-600', scoreRange: '1-8' },
  { profile: 'Moderately Conservative', color: 'bg-indigo-600', scoreRange: '9-12' },
  { profile: 'Moderate', color: 'bg-purple-600', scoreRange: '13-16' },
  { profile: 'Growth', color: 'bg-pink-600', scoreRange: '17-19' },
  { profile: 'Aggressive', color: 'bg-red-600', scoreRange: '20+' },
];

const RiskProfileVisualizer = ({ profile }) => {
  const activeIndex = riskProfiles.findIndex(rp => rp.profile === profile);

  return (
    <div className="flex justify-between items-center w-full max-w-sm mx-auto my-4 relative">
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 bg-gray-200 rounded-full"></div>
      {riskProfiles.map((rp, index) => (
        <div
          key={rp.profile}
          className={`w-8 h-8 rounded-full z-10 flex items-center justify-center transition-all duration-300 relative
                      ${rp.color}
                      ${index <= activeIndex ? 'scale-100' : 'scale-75 bg-gray-400'}
                      ${index === activeIndex ? 'border-4 border-white shadow-lg' : ''}`}
          style={{ marginLeft: index > 0 ? '-16px' : '0' }} // Overlap circles
          title={`${rp.profile} (Score: ${rp.scoreRange})`}
        >
          {index === activeIndex && (
            <span className="text-white text-xs font-bold">{rp.profile.charAt(0)}</span>
          )}
        </div>
      ))}
    </div>
  );
};

export default RiskProfileVisualizer;