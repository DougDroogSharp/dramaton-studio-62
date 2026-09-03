import { DramatonLogo } from "./DramatonLogo";

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-diesel-black">
    <div className="animate-pulse">
      <DramatonLogo className="w-32 h-32 text-diesel-gold" />
    </div>
  </div>
);

export default PageLoader;
