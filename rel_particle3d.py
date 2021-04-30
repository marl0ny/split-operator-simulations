"""
Animation of a particle scattering in a Coulomb potential in 3D
by numerically solving the Dirac equation.
"""
from splitstep import DiracSplitStepMethod
import numpy as np

# Constants
N = 128  # Number of points to use
L = 2.0 # Extent of simulation
S = L*np.linspace(-0.5, 0.5, N)
X, Y, Z = np.meshgrid(S, S, S)
R = L*np.sqrt((X/L)**2 + (Y/L)**2 + (Z/L)**2)
DT = 0.005  # timestep

# The Potential
V = -1000.0/(4.0*np.pi*R)

U = DiracSplitStepMethod(V, (L, L, L), DT)
# U.normalize_at_each_step(True)

# The wavefunction
sigma = 0.07
# sigma = 3.0
e = (1.0 + 0.0j)*np.exp(10.0j*np.pi*X/L)
psi1 = e*np.exp(-((X/L+0.25)/sigma)**2/2.0
                -((Y/L)/sigma)**2/2.0
                -((Z/L)/sigma)**2/2.0)
psi2 = e*np.exp(-((X/L-0.25)/sigma)**2/2.0
                -((Y/L)/sigma)**2/2.0
                -((Z/L)/sigma)**2/2.0)
psi12 = psi1 + np.conj(psi2)
psi = psi12/np.sqrt(np.sum(psi12*np.conj(psi12)))
psi1 = psi1/np.sqrt(np.sum(psi1*np.conj(psi1)))
psi2 = psi2/np.sqrt(np.sum(psi2*np.conj(psi2)))
data = {'psi': [psi1, 
                np.zeros([N, N, N]), np.zeros([N, N, N]),
                np.zeros([N, N, N])]}
abs_val = lambda psi: np.sqrt(np.real(
                              sum([psi[i]*np.conj(psi[i]) for i in range(4)])))

from mayavi import mlab
mlab.figure(1, fgcolor=(1, 1, 1), bgcolor=(0, 0, 0))
plot_data = mlab.pipeline.scalar_field(abs_val(data['psi']))
angle_data = (np.angle(data['psi'][0])).T.ravel()
plot_data.image_data.point_data.add_array(angle_data)
plot_data.image_data.point_data.get_array(1).name = 'phase'
plot_data.update()

plot_data2 = mlab.pipeline.set_active_attribute(plot_data, point_scalars='scalar')
contour = mlab.pipeline.contour(plot_data2)
contour2 = mlab.pipeline.set_active_attribute(contour, point_scalars='phase')
mlab.pipeline.surface(contour2, 
                      colormap='hsv'
                      )

@mlab.animate(delay=10)
def animation():
    while (1):
        for _ in range(1):
            data['psi'] = U(data['psi'])
        plot_data.mlab_source.scalars = abs_val(data['psi'])
        np.copyto(angle_data, np.angle(data['psi'][0]).T.ravel())
        # print(np.sum(np.abs(data['psi'])**2))
        yield

animation()
mlab.show()
