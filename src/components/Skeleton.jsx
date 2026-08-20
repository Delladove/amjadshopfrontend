import React from 'react'

const Skeleton = ({className, height}) => {
  return (
    <div className={`skeleton pulse ${className}`} style={height != null ? { height } : undefined}/>
  );
}

export default Skeleton




