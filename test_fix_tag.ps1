(Get-Content -Path D:\local-dashboard\dev-dashboard\frontend\src\pages\Dashboard.vue) -replace '(?s)      <template v-else-if=.activePage === ''kanban''.>\s*<BoardPage :projects=.projects. />\s*</template>\s*<span>NODE_ID', "      <template v-else-if="activePage === 'kanban'">
        <BoardPage :projects="projects" />
      </template>
    </main>
      <footer class="p-6 border-t border-outline-variant/10 flex justify-between items-center text-outline-variant text-[10px] font-label uppercase tracking-widest">
        <span>NODE_ID" | Set-Content D:\local-dashboard\dev-dashboard\frontend\src\pages\Dashboard.vue
