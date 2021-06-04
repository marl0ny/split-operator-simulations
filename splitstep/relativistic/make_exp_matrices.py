#!/usr/bin/python3
"""
Exponentiating the momentum and mass terms found in the
Dirac equation, as well as the vector potential terms. 
The form of these momentum terms are found on page 565 of 
Principles of Quantum Mechanics by Ramamurti Shankar.
"""
from sympy import Symbol, exp, conjugate, gcd
from sympy import Matrix, ImmutableDenseMatrix
import numpy as np


SIGMA_X = np.array([[0.0, 1.0], 
                    [1.0, 0.0]], dtype=np.complex128)
SIGMA_Y = np.array([[0.0, -1.0j], 
                    [1.0j, 0.0]], dtype=np.complex128)
SIGMA_Z = np.array([[1.0, 0.0], 
                    [0.0, -1.0]], dtype=np.complex128)
I = np.identity(2, dtype=np.complex128)

ALPHA_X = np.kron(np.array([[0.0, 1.0], [1.0, 0.0]]), SIGMA_X)
ALPHA_Y = np.kron(np.array([[0.0, 1.0], [1.0, 0.0]]), SIGMA_Y)
ALPHA_Z = np.kron(np.array([[0.0, 1.0], [1.0, 0.0]]), SIGMA_Z)
BETA = np.kron(np.array([[1.0, 0.0], [0.0, -1.0]]), I)

# Check if the matrices follow the anticommutation rules.
# for i, m1 in enumerate((ALPHA_X, ALPHA_Y, ALPHA_Z, BETA)):
#     for j, m2 in enumerate((ALPHA_X, ALPHA_Y, ALPHA_Z, BETA)):
#         print(i+1, j+1, '\n', np.matmul(m1, m2) + np.matmul(m2, m1))

# Print each of the matrices individually.
# print(ALPHA_X)
# print(ALPHA_Y)
# print(ALPHA_Z)
# print(BETA)


def write_matrix(matrix_expr: ImmutableDenseMatrix, matrix_name: str, 
                 write_start: str, write_end: str) -> None:
    lines1, lines2 = [], []
    pass_start = False
    pass_end = False
    with open('exp_matrices.py', 'r') as f:
        for line in f:
            if not pass_start:
                lines1.append(line)
                if write_start in line:
                    pass_start = True
            else:
                if write_end in line and not pass_end:
                    pass_end = True
                    lines2.append(line)
                elif pass_end:
                    lines2.append(line)
    with open('exp_matrices.py', 'w') as f:
        for line in lines1:
            f.write(line)
        for i in range(4):
            for j in range(4):
                f.write('    %s[%d][%d] = ' % (matrix_name, i, j) + 
                        str(matrix_expr[4*i+j]) + '\n')
        for line in lines2:
            f.write(line)


cdt_hbar = Symbol('cdt_hbar')
px, py, pz = Symbol('px'), Symbol('py'), Symbol('pz')
mc = Symbol('mc')
beta_mc = mc*Matrix(BETA)
p_dot_alpha = px*Matrix(ALPHA_X) + py*Matrix(ALPHA_Y) + pz*Matrix(ALPHA_Z)
p2 = px**2 + py**2 + pz**2
dirac_matrix = p_dot_alpha + beta_mc
exp_p = exp(-0.5j*(dirac_matrix)*cdt_hbar).simplify().subs(p2, 'p2')
write_matrix(exp_p, 'exp_p',
             '# exp p start', '# exp p end')

Ax, Ay, Az = Symbol('Ax'), Symbol('Ay'), Symbol('Az')
A2 = Ax**2 + Ay**2 + Az**2
dt_hbar = Symbol('dt_hbar')
A_dot_alpha = Ax*Matrix(ALPHA_X) + Ay*Matrix(ALPHA_Y) + Az*Matrix(ALPHA_Z)
vector_potential_matrix = A_dot_alpha
exp_vector_potential = exp(0.25j*vector_potential_matrix*
                           dt_hbar).simplify().subs(A2, 'A2').simplify()

write_matrix(exp_vector_potential, 'exp_vector_potential',
             '# exp potential start', '# exp potential end')

