type HeroProps = {
  firstname: string;
};

export default function Hero({firstname}: HeroProps){
    return (
      <div className="flex items-center justify-center w-full h-[36vh] text-white bg-linear-to-b from-[#ff5912] to-[#1a1a1a] ">
        <h1 className="font-semibold text-5xl">welcome, {firstname}!</h1>
      </div>
    );

}