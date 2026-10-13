// Edit these values to personalize your game. All distances use world units.
export const CONFIG = {
  name: 'Fernando N López',
  role: 'Web Developer',
  message: 'Have a business or a brand? Let’s build a digital experience that helps it grow.',
  // Set your own email to show a real contact button at the finish line.
  contactEmail: 'lopezfer1998@outlook.com',
  finishZ: -145,
  maxSpeed: 17,
  acceleration: 10,
  roadHalfWidth: 8,
};
export const OBSTACLES = [
  {x:-3,z:-23,radius:1.1,kind:'rock'}, {x:3,z:-34,radius:.7,kind:'cone'},
  {x:0,z:-47,radius:1.1,kind:'crate'}, {x:-4,z:-60,radius:.7,kind:'cone'},
  {x:3.5,z:-68,radius:1.15,kind:'rock'}, {x:0,z:-82,radius:.7,kind:'cone'},
  {x:-3,z:-97,radius:1.1,kind:'crate'}, {x:3,z:-110,radius:.7,kind:'cone'},
  {x:-1,z:-123,radius:1.1,kind:'rock'},
] as const;
