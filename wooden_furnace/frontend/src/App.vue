<template>
  <DefaultLayout>
    <!-- Navigation -->
    <nav class="flex space-x-2 bg-gray-900 px-6 py-3 border-b border-gray-700">
      <RouterLink
        to="/parts"
        class="px-4 py-2 rounded-md text-sm font-medium transition-colors
               text-gray-300 hover:text-white hover:bg-gray-800
               data-[active=true]:bg-indigo-600 data-[active=true]:text-white"
        :data-active="$route.path === '/parts'"
      >
        Parts
      </RouterLink>
      <RouterLink
        to="/sessions"
        class="px-4 py-2 rounded-md text-sm font-medium transition-colors
               text-gray-300 hover:text-white hover:bg-gray-800
               data-[active=true]:bg-indigo-600 data-[active=true]:text-white"
        :data-active="$route.path === '/sessions'"
      >
        Sessions
      </RouterLink>
      <RouterLink
        to="/reports"
        class="px-4 py-2 rounded-md text-sm font-medium transition-colors
               text-gray-300 hover:text-white hover:bg-gray-800
               data-[active=true]:bg-indigo-600 data-[active=true]:text-white"
        :data-active="$route.path.startsWith('/report')"
      >
        Reports
      </RouterLink>
    </nav>

    <!-- Content -->
    <main class="bg-gray-950 text-gray-200 min-h-screen p-6">
      <RouterView />
    </main>
  </DefaultLayout>
</template>