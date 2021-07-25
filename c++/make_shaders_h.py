import glob
import re
import os


with open('shaders.hpp', 'w') as target_file:
    target_file.write('#ifndef _SHADERS_H_\n#define _SHADERS_H_\n')
    # target_file.write('#include "gl_wrappers2d/gl_wrappers.h"\n\n')
    for filename in glob.glob("./shaders/*", recursive=True):
        filename2 = filename.split('/')[-1]
        tok = filename2.split('.')
        s_type = tok.pop()
        shader_src_name = '_'.join(''.join(tok).split('-'))
        shader_name = shader_src_name + '_shader'
        shader_src_name += '_shader_source'
        with open(filename, 'r') as f2:
            shader_contents = f2.read()
            shader_contents = re.sub('#[ ]*version[ ]+330[ ]+core', '', shader_contents)
            # precision highp float;
            # shader_contents = re.sub('precision highp float;', '', shader_contents)
            target_file.write(f'const char *{shader_src_name} = R\"({shader_contents})\";\n')
            # if s_type == 'vert':
            #     target_file.write(f'GLuint {shader_name}')
            #     target_file.write(f' = make_vertex_shader({shader_src_name});\n\n')
            # elif s_type == 'frag':
            #     target_file.write(f'GLuint {shader_name}')
            #     target_file.write(f' = make_fragment_shader({shader_src_name});\n\n')
    target_file.write('#endif')
