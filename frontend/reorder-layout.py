import re

with open('d:/local-dashboard/dev-dashboard/frontend/src/pages/Dashboard.vue', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Remove grid-asymmetric class
text = text.replace('class="grid-asymmetric max-w-[1920px] mx-auto w-full"', 'class="flex flex-col max-w-[1920px] mx-auto w-full"')

# 2. Extract and remove the <aside> completely.
aside_pattern = re.compile(r'\s*<!-- Right Sidebar for Live Feed \(Threat shield/Activity\) -->.*?</aside>', re.DOTALL)
text = aside_pattern.sub('', text)

# 3. We want to move the entire Workspace block.
# Starts at: '<div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 mt-16">' 
# Ends right before: '<template v-else-if="activePage === \'notes\'">'
# Note: we need to find the specific ending. Let's look at the actual source text.
workspace_start = '<div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 mt-16">'
notes_marker = '        <template v-else-if="activePage === \'notes\'">'

# Let's verify we can find them
if workspace_start in text and notes_marker in text:
    start_idx = text.find(workspace_start)
    end_idx = text.find(notes_marker, start_idx)
    
    # But wait, there is a `</template>\n\n` right before `notes_marker`.
    # Let's back up to find the closest `</template>` before `notes_marker`
    closest_template_end = text.rfind('</template>', start_idx, end_idx)
    
    if closest_template_end != -1:
        # The block is from workspace_start to closest_template_end
        workspace_block = text[start_idx:closest_template_end]
        
        # Remove the block from its current location
        text = text[:start_idx] + text[closest_template_end:]
        
        # 4. Inject it immediately after CPU/Memory block
        # CPU block ends with `Memory Alloc... GB... </div>\n          </div>\n`
        cpu_text_marker = 'Memory Alloc</span>'
        if cpu_text_marker in text:
            # Find the end of its parent <div class="grid grid-cols-2 gap-20 mb-16">
            cpu_idx = text.find(cpu_text_marker)
            grid_end = text.find('          </div>\n', cpu_idx) + len('          </div>\n')
            
            # The next thing is network interfaces and ports
            # Insert workspace_block here
            text = text[:grid_end] + '\n\n' + workspace_block + '\n\n' + text[grid_end:]

            with open('d:/local-dashboard/dev-dashboard/frontend/src/pages/Dashboard.vue', 'w', encoding='utf-8') as f:
                f.write(text)
            print("Successfully moved Workspace and removed Live Feed.")
        else:
            print("Could not find CPU marker")
    else:
        print("Could not find </template> before notes_marker")
else:
    print("Could not find markers for Workspace or Notes")

