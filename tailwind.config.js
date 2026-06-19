/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors:{
        obstetric:{
          critical:"#BA1A1A",
          warning:"#F59E0B",
          success:"#16A34A",
          base:"#612853",
          secondary:"#F9CFD9"
        }
      },
      fontFamily:{
        sans:['Inter','Plus Jakarta Sans']
      }
    },
  },
  plugins: [],
}