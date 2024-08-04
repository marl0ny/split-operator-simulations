import glob
import os
from time import sleep


def get_shader_file_list(path):
    lst = []
    for e in glob.glob(path, recursive=True):
        if e.endswith(".frag") or e.endswith(".vert"):
            lst.append(e)
    lst.sort()
    return lst
        

def refresh_shader_js():
    contents = {}
    for e in get_shader_file_list("./shaders/**/*"):
        if e.endswith(".frag") or e.endswith(".vert"):
            with open(e, 'r') as f:
                content = "".join([line for line in f])
                content = content.replace('\n', '\\n')
                contents[e] = content

    with open('shaders.js', 'w') as f:
        f.write('let shaders = {};\n')
        for k in contents:
            k2 = k.replace("\\", "/")
            f.write(f'shaders[`{k2}`] = `{contents[k]}`;\n')
        f.write('const SHADERS = shaders;\n')
        f.write('export default SHADERS;\n')
        f.write('export const getShader = name => ' 
            + '{console.log(`Getting ${name}.`); return SHADERS[name];}\n')


refresh_shader_js()
files_and_mod_dates = [{}]
for e in get_shader_file_list("./shaders/**/*"):
    if e.endswith(".frag") or e.endswith(".vert"):
        files_and_mod_dates[0][e] = os.stat(e).st_mtime
print("Creating shaders.js file.")

while True:
    new_files_and_mod_dates = {}
    for e in get_shader_file_list("./shaders/**/*"):
        if e.endswith(".frag") or e.endswith(".vert"):
            new_files_and_mod_dates[e] = os.stat(e).st_mtime
    new_files = set(new_files_and_mod_dates.keys())
    old_files = set(files_and_mod_dates[0].keys())
    if new_files != old_files:
        additions = new_files.difference(old_files)
        deletions = old_files.difference(new_files)
        str_additions = str(additions).strip('{').strip('}')
        str_deletions = str(deletions).strip('{').strip('}')
        string = 'Updating shaders.js: '
        if len(additions) > 0:
            string += f'added {str_additions}'
        elif len(deletions) > 0:
            string += ', ' if (len(additions) > 0) else '' \
                + f'removed {str_deletions}'
        print(string + '.')
        refresh_shader_js()
    else:
        is_modified = [new_files_and_mod_dates[k] == files_and_mod_dates[0][k]
                       for k in new_files_and_mod_dates.keys()]
        if not all(is_modified):
            mod_files = [k for i, k 
                         in enumerate(new_files_and_mod_dates.keys())
                         if not is_modified[i]]
            str_mod_files = str(mod_files).strip('[').strip(']')
            was_were = 'was' if len(mod_files) == 1 else 'were'
            print(f'Updating shaders.js: {str_mod_files} {was_were} modified.'
                  )
            refresh_shader_js()
    files_and_mod_dates[0] = new_files_and_mod_dates
    sleep(0.25)
