export default function NotFound() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-4 px-5 py-8">
      <h1 className="my-8 text-[56px] font-medium leading-normal tracking-normal text-[#08060d] dark:text-gray-100 max-[1024px]:my-5 max-[1024px]:text-4xl">
        Not found
      </h1>
      <p>The page you requested does not exist.</p>
    </section>
  )
}
