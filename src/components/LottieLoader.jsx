import Lottie from "lottie-react";
import loadingAnimation from "../assets/cloud.json";

const LottieLoader = () => {
  return (
      <div style={{ display: "flex",flexDirection:"column", alignItems: "center"}}>
      <Lottie
        animationData={loadingAnimation}
        loop
        autoplay
        style={{ width: 150, height: 150 }}
      />
      <p>Fetching Data...</p>
    </div>
  )
}

export default LottieLoader
