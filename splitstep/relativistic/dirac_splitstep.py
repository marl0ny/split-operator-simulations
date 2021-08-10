from .. import SplitStepMethod
import numpy as np
from typing import Tuple, Union, List, Dict

class DiracSplitStepMethod(SplitStepMethod):
    """
    The Dirac Split-Step method. 
    Unlike the other classes which use metric units,
    this uses Hartree atomic units.

    References:

    Shankar R. (1994). The Dirac Equation. In Principles of Quantum Mechanics,
    chapter 20. Plenum Press.

    Bauke H., Keitel C. (2011).
    Accelerating the Fourier split operator method via graphics processing units.
    182(12), 2454-2463. https://doi.org/10.1016/j.cpc.2011.07.003
    https://arxiv.org/abs/1012.3911


    https://en.wikipedia.org/wiki/Dirac_equation

    Hartree units:

    https://en.wikipedia.org/wiki/Hartree_atomic_units

    """

    def __init__(self, potential: np.ndarray,
                 dimensions: Tuple[float, ...],
                 timestep: Union[float, np.complex128] = 1.0,
                 m: float = 1.0,
                 vector_potential: List[np.ndarray] = None,
                 units: Dict[str, float] = None):
        self._exp_p = None
        self._exp_V = None
        self._m = m
        self._vector_potential = vector_potential
        self.use_one_matrix_for_momentum_step = True
        self.C = units['c'] if units and 'c' in units.keys() else 137.036
        self.HBAR = (units['hbar'] if units and 'hbar' 
                        in units.keys() else 1.0)
        SplitStepMethod.__init__(self, potential, dimensions, timestep)

    def set_timestep(self, timestep: Union[float, np.complex128]) -> None:
        p_list = []
        for i, d in enumerate(self.V.shape):
            freq = np.pi*np.fft.fftfreq(d)
            freq[0] = 1e-80
            p_list.append(np.complex128(2.0)*freq*d/self._dim[i])
        p = np.meshgrid(*p_list)
        zeros = np.zeros(self.V.shape, dtype=np.complex128)
        px, py, pz = [p[i] if i < len(p) else 0.0 for i in range(3)]
        p2 = sum([p_i**2 for p_i in p])
        p = np.sqrt(p2)
        self._dt = np.complex128(timestep)
        dt = self._dt
        mc = self._m*self.C
        cdt_hbar = self.C*dt/self.HBAR
        omega = np.sqrt(mc*mc + p2)
        den1 = p*np.sqrt((mc - omega)**2 + p2)
        den2 = p*np.sqrt((mc + omega)**2 + p2)
        # Originally, the matrix involving the momentum and mass terms was
        # found by exponentiating it in its entirety. Instead, of doing
        # this, this matrix is diagonalized using Sympy, where one
        # gets that this matrix is equal to U E inv(U), 
        # where E is the diagonal eigenvalue matrix 
        # and U is the matrix of eigenvectors.
        # This is following how it is similarly done in
        # II.3 of the paper by Bauke and Keitel: 
        # https://arxiv.org/abs/1012.3911.
        # The matrix U is found in the file make_exp_matrices.py.
        u = [# First row
             pz*(mc - omega)/den1,
             (mc*px - 1.0j*mc*py + (-px + 1.0j*py)*omega)/den1,
             pz*(mc + omega)/den2,
             (mc*px - 1.0j*mc*py + (px - 1.0j*py)*omega)/den2,
             # Second Row
             (mc*px + 1.0j*mc*py - (px + 1.0j*py)*omega)/den1,
             -pz*(mc - omega)/den1,
             (mc*px + 1.0j*mc*py + (px + 1.0j*py)*omega)/den2,
             -pz*(mc + omega)/den2,
             # Third Row
             p2/den1, zeros,
             p2/den2, zeros,
             # Fourth Row
             zeros, p2/den1, 
             zeros, p2/den2]
        u = np.array(u).reshape([4, 4] + list(self.V.shape))
        ind = [i for i in range(len(self.V.shape) + 2)]
        ind[0], ind[1] = ind[1], ind[0]
        u_dagger = np.conj(np.transpose(u, ind))
        e1 = np.exp(0.5j*omega*cdt_hbar)
        e2 = np.exp(-0.5j*omega*cdt_hbar)
        exp_e = np.array([[e1, zeros, zeros, zeros],
                          [zeros, e1, zeros, zeros],
                          [zeros, zeros, e2, zeros],
                          [zeros, zeros, zeros, e2]])
        exp_e_u = np.einsum('ij...,jk...->ik...', exp_e, u_dagger)
        self._u = u
        self._u_dagger = u_dagger
        self._exp_e = exp_e
        self._exp_p = np.einsum('ij...,jk...->ik...', u, exp_e_u)
        self.set_potential(self.V, self._vector_potential)

    def set_potential(self, potential: np.ndarray, 
                      vector_potential: List[np.ndarray] = None) -> None:
        if self.V is not potential:
            self.V = potential
        if self._vector_potential is not vector_potential:
            self._vector_potential = vector_potential
        V = potential
        dt = np.complex128(self._dt)
        m = np.complex128(self._m)
        if vector_potential:
            exp_vec = get_exp_vector_potential(dt, self._vector_potential, m,
                                               hbar=self.HBAR)
            exp_A_V = [[0.0, 0.0, 0.0, 0.0] for i in range(4)]
            for i in range(4):
                for j in range(4):
                    exp_A_V[i][j] = exp_vec[i][j]*np.exp(-0.25*1.0j*V*dt)
            self._exp_V = np.array(exp_A_V)
        else:
            dt_hbar = dt/self.HBAR
            # exp_V = [[np.exp(-0.25*1.0j*V*dt_hbar), zeros, zeros, zeros], 
            #          [zeros, np.exp(-0.25*1.0j*V*dt_hbar), zeros, zeros], 
            #          [zeros, zeros, np.exp(-0.25*1.0j*V*dt_hbar), zeros], 
            #          [zeros, zeros, zeros, np.exp(-0.25*1.0j*V*dt_hbar)]]
            exp_V = [np.exp(-0.25*1.0j*V*dt_hbar) for i in range(4)]
            self._exp_V = np.array(exp_V)

    def _exp_p_call(self, psi: np.ndarray) -> np.ndarray:
        if self.use_one_matrix_for_momentum_step:
            psi = np.einsum('ij...,j...->i...', self._exp_p, psi)
            return psi 
        psi = np.einsum('ij...,j...->i...', self._u_dagger, psi)
        psi = np.einsum('ij...,j...->i...', self._exp_e, psi)
        psi = np.einsum('ij...,j...->i...', self._u, psi)
        return psi

    def _exp_potential_call(self, psi: np.ndarray) -> np.ndarray:
        if self._vector_potential is not None:
            return np.einsum('ij...,j...->i...', self._exp_V, psi)
        else:
            for i in range(4):
                psi[i] *= self._exp_V[i]
            return psi

    def __call__(self, psi: np.ndarray) -> np.ndarray:
        psi = self._exp_potential_call(psi)
        psi_p = np.array([np.fft.fftn(psi[i]) for i in range(4)])
        psi_p = self._exp_p_call(psi_p)
        psi = np.array([np.fft.ifftn(psi_p[i]) for i in range(4)])
        psi = self._exp_potential_call(psi)
        if self._norm:
            pass
        return psi


def get_exp_vector_potential(dt: float, 
                             A: List[np.ndarray], m: float, 
                             hbar: float = 1.0
                            ) -> List[List[Union[np.ndarray, float]]]:
    Ax, Ay, Az = A
    A2 = Ax*Ax + Ay*Ay + Az*Az
    dt_hbar = dt/hbar
    I = 1.0j
    cosh, sinh = np.cosh, np.sinh
    exp_vector = [[0, 0, 0, 0] for i in range(4)]
    # exp potential start
    exp_vector[0][0] = 1.0*cosh(0.25*(-A2*dt_hbar**2)**0.5)
    exp_vector[0][1] = 0
    exp_vector[0][2] = 1.0*I*Az*dt_hbar*(-A2*dt_hbar**2)**(-0.5)\
                        *sinh(0.25*(-A2*dt_hbar**2)**0.5)
    exp_vector[0][3] = 1.0*dt_hbar*(-A2*dt_hbar**2)**(-0.5)*(I*Ax + Ay)\
                        *sinh(0.25*(-A2*dt_hbar**2)**0.5)
    exp_vector[1][0] = 0
    exp_vector[1][1] = 1.0*cosh(0.25*(-A2*dt_hbar**2)**0.5)
    exp_vector[1][2] = 1.0*dt_hbar*(-A2*dt_hbar**2)**(-0.5)*(I*Ax - Ay)\
                        *sinh(0.25*(-A2*dt_hbar**2)**0.5)
    exp_vector[1][3] = -1.0*I*Az*dt_hbar*(-A2*dt_hbar**2)**(-0.5)\
                        *sinh(0.25*(-A2*dt_hbar**2)**0.5)
    exp_vector[2][0] = -1.0*I*Az*(-A2*dt_hbar**2)**0.5\
                        *sinh(0.25*(-A2*dt_hbar**2)**0.5)/(A2*dt_hbar)
    exp_vector[2][1] = -1.0*(-A2*dt_hbar**2)**0.5*(I*Ax + Ay)\
                        *sinh(0.25*(-A2*dt_hbar**2)**0.5)/(dt_hbar*A2)
    exp_vector[2][2] = 1.0*cosh(0.25*(-A2*dt_hbar**2)**0.5)
    exp_vector[2][3] = 0
    exp_vector[3][0] = -1.0*(-A2*dt_hbar**2)**0.5*(I*Ax - Ay)\
                        *sinh(0.25*(-A2*dt_hbar**2)**0.5)/(dt_hbar*A2)
    exp_vector[3][1] = 1.0*I*Az*(-A2*dt_hbar**2)**0.5*\
                        sinh(0.25*(-A2*dt_hbar**2)**0.5)/(A2*dt_hbar)
    exp_vector[3][2] = 0
    exp_vector[3][3] = 1.0*cosh(0.25*(-A2*dt_hbar**2)**0.5)
    # exp potential end
    return exp_vector

