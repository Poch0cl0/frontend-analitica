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