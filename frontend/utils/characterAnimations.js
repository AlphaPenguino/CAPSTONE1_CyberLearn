const loadAnimationFrames = (folderPath, frameCount, prefix) => {
  return Array.from({ length: frameCount }).map((_, index) => {
    const frameIndex = index.toString().padStart(2, '0');
    return require(`../assets/images/robotboy/${folderPath}/${prefix}${frameIndex}.png`);
  });
};
//
// Animation mapping
export const characterAnimations = {
  idle: loadAnimationFrames('00_idle', 14, 'skeleton-00_idle_'),
  attack: loadAnimationFrames('04_punch', 14, 'skeleton-04_punch_'), 
  hurt: loadAnimationFrames('03_ko', 10, 'skeleton-03_ko_'),
  victory: loadAnimationFrames('01_run_00ready', 10, 'skeleton-01_run_00ready_')
};

// Frame rates for different animations
export const animationFps = {
  idle: 10,
  attack: 15, // Faster for attack animation
  hurt: 12,
  victory: 10
};